import { useRef } from "react";
import {
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ScriptableContext,
} from "chart.js";
import { Line } from "react-chartjs-2";
import styles from "./TrendChart.module.css";

/** The exec dashboard's line/area chart (2026-11-27, the Stitch mock's SVG
 *  geometry ported to Chart.js v4): smooth curved series sharing one
 *  0→max y-scale over four faint grid rows and a solid baseline, a colour
 *  wash fading to transparent under area series, white-stroked dots on the
 *  marked indexes, and a subtle nearest-point tooltip. Both scales' chrome
 *  is hidden — the page renders its own HTML axis labels — and the
 *  responsive canvas fills the page's `.chartBox`. An all-zero chart still
 *  renders honest flat lines on the baseline. */

export interface TrendSeries {
  /** Unique inside this chart — keys the series in the chart data. */
  key: string;
  /** The tooltip text the dots carry, e.g. "Checked in: 5". */
  label: string;
  color: string;
  values: number[];
  /** Gradient wash under the line (the mock's rising hero series). */
  area?: boolean;
  /** Dashed reference line (the tracked/total baseline) — never dotted. */
  dashed?: boolean;
  /** Indexes that carry the white-stroked tooltip dots. */
  dotIndexes?: number[];
}

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler, Tooltip);

const GRID_ROW = "#f1f5f9";
const BASELINE_ROW = "#e2e8f0";

/** ── Animation recipe (the researched subtle envelope) ────────────────
 *  Mount: the official "progressive line" draw-in — points sweep in left
 *  to right, each segment growing out of its neighbour, over ~1.5s (the
 *  sample's 10s is for 1000 points; dashboard-sized data reads subtle at
 *  a quarter of that). Preset switches: a 300ms easeOutCubic slide where
 *  points travel to their new positions — never a replayed sweep.
 *  Reduced-motion users get an instant, clean render everywhere. */

const DRAW_TOTAL_MS = 1500;
const SWAP_MS = 300;

const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The delay/previousY callbacks speak the official sample's loose shape
 *  (xStarted/yStarted are runtime flags, not part of the public types). */
interface DrawContext {
  type: string;
  index: number;
  datasetIndex: number;
  xStarted?: boolean;
  yStarted?: boolean;
  chart: Chart;
}

function progressiveDraw(
  count: number,
  drawn: { current: boolean },
): NonNullable<ChartOptions<"line">["animation"]> {
  const step = DRAW_TOTAL_MS / Math.max(1, count);
  const baseline = (ctx: DrawContext) => ctx.chart.scales.y.getPixelForValue(0);
  // Each segment grows out of the point to its left; the first grows out
  // of the baseline (the official sample's previousY).
  const previousY = (ctx: DrawContext): number => {
    if (ctx.index === 0) return baseline(ctx);
    // Per-dataset meta — a series segment grows out of ITS own previous
    // point, not dataset 0's.
    const previous = ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1] as unknown as {
      getProps: (keys: ["y"], final: boolean) => { y: number };
    };
    return previous?.getProps(["y"], true).y ?? baseline(ctx);
  };
  const delayOf =
    (flag: "xStarted" | "yStarted") =>
    (ctx: DrawContext): number => {
      // Runs once per chart: after the sweep completes (onComplete), any
      // later plain update renders instantly instead of re-sweeping.
      if (ctx.type !== "data" || ctx[flag] || drawn.current) return 0;
      ctx[flag] = true;
      return ctx.index * step;
    };
  return {
    x: { type: "number", easing: "linear", duration: step, from: NaN, delay: delayOf("xStarted") },
    y: {
      type: "number",
      easing: "linear",
      duration: step,
      from: previousY,
      delay: delayOf("yStarted"),
    },
    onComplete: () => {
      drawn.current = true;
    },
  } as NonNullable<ChartOptions<"line">["animation"]>;
}

/** The mock's geometry on the 240px `.chartBox` (the SVG's TOP=20 and
 *  BASELINE=170 units of 180 scaled by 240/180): headroom above the top
 *  grid row, a sliver under the baseline, and side padding so the edge
 *  dots stay whole — the SVG's `overflow: visible` on a canvas that
 *  cannot paint outside itself. */
const CHART_PADDING = { top: 27, bottom: 13, left: 8, right: 8 } as const;

/** Where the four faint grid rows sit as fractions of the y range — the
 *  mock's 40-unit rows over its 150-unit band ([20, 60, 100, 140] between
 *  TOP and BASELINE), i.e. even steps of [3, 7, 11, 15]/15 of the max. */
const GRID_ROW_FRACTIONS = [3 / 15, 7 / 15, 11 / 15, 1] as const;

/** `#rrggbb` → rgba at `alpha`; any other colour string passes through. */
function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex === null) return color;
  const n = Number.parseInt(hex[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** One vertical wash per chart+colour+geometry, reused across frames — the
 *  scriptable backgroundColor would otherwise mint a gradient each frame
 *  of an animation. */
const washes = new WeakMap<object, Map<string, CanvasGradient>>();

function areaWash(context: ScriptableContext<"line">, color: string): CanvasGradient | string {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (chartArea === undefined) return "transparent";
  const key = `${color}|${chartArea.left}|${chartArea.top}|${chartArea.right}|${chartArea.bottom}`;
  let perChart = washes.get(chart);
  if (perChart === undefined) {
    perChart = new Map();
    washes.set(chart, perChart);
  }
  const cached = perChart.get(key);
  if (cached !== undefined) return cached;
  const wash = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  wash.addColorStop(0, withAlpha(color, 0.22));
  wash.addColorStop(1, withAlpha(color, 0.01));
  perChart.set(key, wash);
  return wash;
}

export function TrendChart({ series, ariaLabel }: { series: TrendSeries[]; ariaLabel: string }) {
  const count = series[0]?.values.length ?? 0;
  // The SVG's shared scale: every series reads against one max (the 1
  // keeps all-zero windows honest at the baseline instead of blowing up).
  const yMax = Math.max(1, ...series.flatMap((s) => s.values));
  const xMax = Math.max(count - 1, 1);
  // The draw-in runs once per mounted chart (the guard flips on completion
  // so a mid-sweep preset switch can never re-sweep).
  const drawnRef = useRef(false);

  const data: ChartData<"line", Array<{ x: number; y: number }>> = {
    datasets: series.map((s) => {
      const dots = s.dotIndexes ?? [];
      return {
        label: s.label,
        // Plain {x,y} pairs on hidden linear scales — no parsing needed.
        data: s.values.map((y, x) => ({ x, y })),
        borderColor: s.color,
        borderWidth: s.dashed ? 1.5 : 2.5,
        borderDash: s.dashed ? [4, 4] : undefined,
        borderCapStyle: "round",
        borderJoinStyle: "round",
        tension: 0.4,
        fill: s.area === true,
        backgroundColor:
          s.area === true
            ? (context: ScriptableContext<"line">) => areaWash(context, s.color)
            : "transparent",
        // The white-stroked tooltip dots; dashed lines never carry points.
        pointRadius: (context: ScriptableContext<"line">) => {
          if (s.dashed || context.dataIndex === undefined) return 0;
          return dots.includes(context.dataIndex) ? 4.5 : 0;
        },
        pointHoverRadius: s.dashed ? 0 : 5,
        pointBackgroundColor: s.color,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointHoverBorderWidth: 2,
        // The SVG drew with `overflow: visible`; a canvas can't, so let
        // the line and its dots paint right up to the canvas edge.
        clip: false,
      };
    }),
  };

  const options: ChartOptions<"line"> = {
    /* ── Animation — the ONE block to tune motion ────────────────────
       Mount: the progressive draw-in (progressiveDraw above). Every prop
       change (the preset links swap the datasets) rides the 'presetSwap'
       transition below — points slide to their new positions in 300ms
       instead of replaying the sweep. Hover jitter is off: the 'active'
       transition is what fires on hover and its duration is pinned to 0,
       and colour fades are disabled so a preset switch swaps hues
       instantly. prefers-reduced-motion renders everything instantly. */
    animation: prefersReducedMotion
      ? false
      : // The drawn flag is read inside Chart.js's animation callbacks at
        // DRAW time and in onComplete after the sweep — never during
        // render; passing it here only binds the closure.
        // eslint-disable-next-line react-hooks/refs
        progressiveDraw(count, drawnRef),
    animations: {
      colors: false,
    },
    transitions: {
      active: {
        animation: { duration: 0 },
      },
      presetSwap: {
        animation: {
          duration: prefersReducedMotion ? 0 : SWAP_MS,
          easing: "easeOutCubic",
        },
        animations: {
          // Cancel the progressive per-point envelope: the points travel
          // to their new positions as one subtle move.
          x: { duration: SWAP_MS, delay: 0, from: undefined },
          y: { duration: SWAP_MS, delay: 0, from: undefined },
        },
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    parsing: false,
    interaction: {
      mode: "nearest",
      intersect: false,
    },
    layout: {
      padding: CHART_PADDING,
    },
    scales: {
      // The page renders its own HTML x labels below the chart.
      x: {
        type: "linear",
        display: false,
        min: 0,
        max: xMax,
      },
      // No ticks, no labels, no edge border — but scale `display: false`
      // would drop the mock's grid rows too, so the y scale stays alive
      // and its chrome is hidden piece by piece.
      y: {
        type: "linear",
        min: 0,
        max: yMax,
        ticks: { display: false },
        border: { display: false },
        afterBuildTicks: (axis) => {
          axis.ticks = [0, ...GRID_ROW_FRACTIONS.map((f) => f * yMax)].map((value) => ({ value }));
        },
        grid: {
          color: (gctx) => (gctx.tick.value === 0 ? BASELINE_ROW : GRID_ROW),
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        // Chart.js spells the box radius cornerRadius.
        cornerRadius: 8,
        padding: 10,
        titleFont: { family: "Inter", size: 11, weight: 600 },
        bodyFont: { family: "Inter", size: 12 },
        displayColors: false,
        callbacks: {
          // The old dots' `<title>` read "Checked in: 5" — split here
          // into the series name over the value.
          title: (items) => String(items[0]?.dataset.label ?? ""),
          label: (item) => String(item.parsed.y),
        },
      },
    },
  };

  return (
    // The canvas is decoration on top of the announced label.
    <div className={styles.chartBox} role="img" aria-label={ariaLabel}>
      <Line
        aria-hidden="true"
        data={data}
        options={options}
        /* Every data change (preset switch) slides via the 'presetSwap'
           transition; the progressive sweep is the mount animation only.
           react-chartjs-2's prop type lists only the built-in modes, but
           the wrapper forwards the string straight to chart.update(mode) —
           the official way custom transition modes trigger. */
        updateMode={"presetSwap" as "default"}
      />
    </div>
  );
}
