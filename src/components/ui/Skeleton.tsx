import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./Skeleton.module.css";

/**
 * Shared skeleton primitives (CAP-4, 2026-11-26), derived from the console's
 * original TableSkeleton recipe and its `--color-shimmer-sheen` token: every
 * loading placeholder in the console is composed from this one system, so
 * shimmer feels native to the design instead of bolted on per page.
 *
 * The pieces:
 *   - SkeletonBlock: the base shimmer block (a line, a pill, a circle — any
 *     box). Purely decorative: it carries aria-hidden itself.
 *   - SkeletonRow: one row of blocks. A cell given as a number is a
 *     proportional weight (like a table column), a string is a fixed width
 *     (like an avatar).
 *   - SkeletonList: rows stacked with the table grid's gap; either composed
 *     from children or a `rows`/`cells` shorthand.
 *   - SkeletonDelay: the show-delay wrapper from the loading cases
 *     (loading-cases.md): children appear only after 300ms of waiting, and
 *     once shown stay for at least 500ms, so a skeleton reads as a state,
 *     not a glitch. Nothing renders while the data is still fast (< 300ms),
 *     so skeletons never flash.
 *   - SkeletonSlot: the same thresholds driving a swap — while a load
 *     persists past the delay the slot shows the `skeleton` in place of the
 *     real children, and the children return the moment the skeleton's
 *     minimum display is spent. Used by the console's shell (route
 *     navigation) and by pages (region reloads), so the old content stays
 *     visible through the first 300ms and the arrived content never waits
 *     behind a skeleton that has already left.
 *
 * The standard composition for a loading region — the page (or the shell)
 * owns the role="status" announcement around the slot:
 *
 *   <SkeletonSlot show={loading} skeleton={<SkeletonList rows={6} />}>
 *     <RealContent />
 *   </SkeletonSlot>
 *
 * Reduced motion: the shimmer stops and the blocks render as static sunken
 * blocks — see Skeleton.module.css. Dimensions: consumers size the archetypes
 * to the content they stand in for (CLS ≤ 0.1), never to a fixed guess.
 */

/** The loading cases' two binding thresholds, as named constants so tests
 *  and callers can import the contract instead of restating it. */
export const SKELETON_DELAY_MS = 300;
export const SKELETON_MIN_DISPLAY_MS = 500;

/** A cell width: a number is a proportional weight, a string a fixed width. */
type SkeletonCellWidth = number | string;

/** Join optional class names the way the rest of the console does — no
 *  string-class literals, only module keys. */
function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter((part): part is string => part !== false && part !== undefined).join(" ");
}

/** The base shimmer block: every skeleton is one or more of these. */
export function SkeletonBlock({
  width,
  height,
  radius = "sm",
  className,
  style,
}: {
  /** CSS width — number means px, a string passes through (%, rem, ch). */
  width?: SkeletonCellWidth;
  height?: SkeletonCellWidth;
  /** Tokened corner vocabulary; "circle" makes an avatar dot. */
  radius?: "xs" | "sm" | "md" | "lg" | "pill" | "circle" | "none";
  className?: string;
  style?: CSSProperties;
}) {
  const radiusClass =
    radius === "sm"
      ? undefined
      : radius === "xs"
        ? styles.radiusXs
        : radius === "md"
          ? styles.radiusMd
          : radius === "lg"
            ? styles.radiusLg
            : radius === "pill"
              ? styles.radiusPill
              : radius === "circle"
                ? styles.radiusCircle
                : styles.radiusNone;
  return (
    <span
      className={cx(styles.block, radiusClass, className)}
      aria-hidden="true"
      style={{
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        ...style,
      }}
    />
  );
}

/** One row of the content standing in: cells sized like the real columns. */
export function SkeletonRow({
  cells,
  height,
  className,
}: {
  cells: ReadonlyArray<SkeletonCellWidth>;
  height?: SkeletonCellWidth;
  className?: string;
}) {
  return (
    <div className={cx(styles.row, className)} aria-hidden="true">
      {cells.map((cell, index) =>
        typeof cell === "number" ? (
          <SkeletonBlock key={index} height={height} style={{ flex: `${cell} 1 0%` }} />
        ) : (
          <SkeletonBlock key={index} width={cell} height={height} style={{ flex: "0 0 auto" }} />
        ),
      )}
    </div>
  );
}

/** Rows stacked with the table grid's gap. Compose rows from children when
 *  each row differs, or use the rows/cells shorthand for a uniform table. */
export function SkeletonList({
  rows,
  cells,
  rowHeight,
  className,
  children,
}: {
  /** How many rows, with `cells` describing each row. */
  rows?: number;
  cells?: ReadonlyArray<SkeletonCellWidth>;
  rowHeight?: SkeletonCellWidth;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx(styles.list, className)} aria-hidden="true">
      {children ??
        Array.from({ length: rows ?? 0 }, (_, index) => (
          <SkeletonRow key={index} cells={cells ?? []} height={rowHeight} />
        ))}
    </div>
  );
}

/**
 * The shared state machine behind SkeletonDelay and SkeletonSlot: does the
 * skeleton occupy its slot right now? Children appear only after `delayMs`
 * (300ms) of continuous waiting — under that, nothing shows, so a skeleton
 * never flashes past. Once shown, it stays for at least `minDisplayMs`
 * (500ms) even if `show` drops sooner, so it reads as a state rather than a
 * glitch; a wait that ends inside the first delay never shows it at all.
 *
 * Keep the caller mounted across the load — the hook holds the timers that
 * enforce both thresholds.
 */
function useSkeletonShowing(show: boolean, delayMs: number, minDisplayMs: number): boolean {
  const [showing, setShowing] = useState(false);
  // When the skeleton first appeared — null while it has never shown.
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (show) {
      const timer = window.setTimeout(() => {
        shownAtRef.current = Date.now();
        setShowing(true);
      }, delayMs);
      return () => window.clearTimeout(timer);
    }
    if (shownAtRef.current !== null) {
      // The data arrived while the skeleton was up: hold it until it has
      // been visible for the minimum display, then take it down.
      const remaining = minDisplayMs - (Date.now() - shownAtRef.current);
      if (remaining <= 0) {
        shownAtRef.current = null;
        setShowing(false);
        return;
      }
      const timer = window.setTimeout(() => {
        shownAtRef.current = null;
        setShowing(false);
      }, remaining);
      return () => window.clearTimeout(timer);
    }
  }, [show, delayMs, minDisplayMs]);

  return showing;
}

/**
 * The show-delay wrapper from the loading cases: children appear only after
 * `delayMs` (300ms) of continuous waiting and stay for at least
 * `minDisplayMs` (500ms). Renders nothing until then.
 */
export function SkeletonDelay({
  show = true,
  delayMs = SKELETON_DELAY_MS,
  minDisplayMs = SKELETON_MIN_DISPLAY_MS,
  className,
  children,
}: {
  show?: boolean;
  delayMs?: number;
  minDisplayMs?: number;
  className?: string;
  children?: ReactNode;
}) {
  const showing = useSkeletonShowing(show, delayMs, minDisplayMs);
  if (!showing) {
    return null;
  }
  return <div className={className}>{children}</div>;
}

/**
 * The same thresholds driving a content swap: while a load persists past
 * the delay, the slot shows `skeleton` in place of the real children; the
 * children return the moment the skeleton's minimum display is spent. While
 * the load is still inside the first 300ms the children stay visible, so
 * the current content never flickers away for a fast load.
 *
 * The `className` styles only the skeleton wrapper (the slot when it shows
 * the skeleton) — the children render unwrapped, so live content keeps its
 * own layout untouched.
 */
export function SkeletonSlot({
  show = false,
  skeleton,
  className,
  children,
}: {
  show?: boolean;
  skeleton?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const showing = useSkeletonShowing(show, SKELETON_DELAY_MS, SKELETON_MIN_DISPLAY_MS);
  if (!showing) {
    return <>{children}</>;
  }
  return <div className={className}>{skeleton}</div>;
}
