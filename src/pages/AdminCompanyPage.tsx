import { useState } from "react";
import { Link, useLoaderData, useLocation, useNavigation, useRevalidator } from "react-router";
import { CalendarDays, ChevronRight, Star } from "lucide-react";
import type { adminCompanyLoader } from "../features/admin/adminCompanyLoader";
import type { SubscriptionFacts } from "../features/admin/adminCompanyLoader";
import type {
  OwnerExecReportResponse,
  OwnerTrendSlice,
  OwnerWorkforceBucket,
} from "../features/admin/jobReportsApi";
import type { Slice } from "../features/admin/slice";
import type { AttendanceTrendDay, AttendanceTrendResponse } from "../features/admin/companyApi";
import { SkeletonRow, SkeletonSlot } from "../components/ui/Skeleton";
import { TrendChart } from "../features/admin/components/TrendChart";
import { fmtDayMonth, fmtIstDay, istToday } from "../features/admin/format";
import styles from "./AdminCompanyPage.module.css";

/** The exec dashboard's chart hues — the Stitch mock's literal palette. The
 *  series identity lives HERE so every card, legend and line agrees. */
const COLORS = {
  trackedLine: "#93c5fd",
  tracked: "#3b82f6",
  checkedIn: "#10b981",
  notChecked: "#fbbf24",
  shortDay: "#818cf8",
  lateLeave: "#fb7185",
  employeeCreated: "#2563eb",
  approved: "#059669",
  autoApproved: "#f59e0b",
  ownerCreated: "#9333ea",
} as const;

/** The overview's period presets — the mock's three, mapped onto the
 *  loader's `?range=` values. The old page's five links stay resolvable
 *  (shareable `range=today` addresses still work); only these three render. */
const PRESETS: Array<{ preset: string; label: string }> = [
  { preset: "7", label: "7D" },
  { preset: "30", label: "30 Days" },
  { preset: "this-month", label: "This Month" },
];

/** The owner's overview — the console's one landing page, revamped
 *  2026-11-27 into the executive dashboard (Stitch project 12976873967605867584):
 *  the subscription banner, the attendance trend, the jobs & approvals flow
 *  and the workforce analytics chart. The pulse tiles, the link cards, the
 *  per-employee table and every list are gone by owner decision — this page
 *  reads like a command centre now, the detail lives on each section's own
 *  console page. */
export function AdminCompanyPage() {
  const data = useLoaderData<typeof adminCompanyLoader>();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const busy = revalidator.state !== "idle" || navigation.state !== "idle";
  // The charts' preset is read from the address on every render — a preset
  // link is navigation, and the loader refetches both slices for it.
  const location = useLocation();
  const preset = new URLSearchParams(location.search).get("range") ?? "7";
  // The dashboard region's load: a preset link changes only the address's
  // range — while it persists past the delay the three chart cards stand in,
  // and the banner and greeting around them stay put. A different page's
  // navigation is the shell's skeleton; the same-address "Try again" reload
  // keeps the failed card.
  const regionPending =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname &&
    navigation.location?.search !== location.search;
  // The legend chips' hidden-series state lives at the page level, BEFORE
  // the failed-state early return — hooks cannot sit behind a conditional
  // return — and above the region's skeleton slot: a preset navigation
  // swaps the cards out, and a toggle is a view preference that survives
  // the swap (BMAD review 2026-11-28).
  const [hidden, toggleHidden] = useHiddenSeries();

  if (data.state === "failed") {
    return (
      <>
        <TopBar />
        <div className={styles.stack}>
          <div className={styles.chartCard}>
            <p className={styles.failed} role="alert">
              The company data could not load.
              <button
                type="button"
                className={styles.retry}
                onClick={() => revalidator.revalidate()}
                disabled={busy}
              >
                {busy ? "Retrying…" : "Retry"}
              </button>
            </p>
          </div>
        </div>
      </>
    );
  }

  const retryTo = `${location.pathname}${location.search}`;

  return (
    <>
      <TopBar />
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.heading}>
            {data.selfName === null ? "Hello" : `Hello, ${data.selfName}`}
            <span className={styles.rolePill}>
              <Star size={13} className={styles.rolePillIcon} fill="currentColor" />
              Owner
            </span>
          </h1>
          <p className={styles.lede}>
            See today's updates, work reports, and all company lists in one place.
          </p>
        </div>
      </header>

      <SubscriptionBanner subscription={data.subscription} />

      <SkeletonSlot show={regionPending} className={styles.stack} skeleton={<DashSkeleton />}>
        <div className={styles.chartGrid}>
          {/* The workforce card leads (owner's 2026-11-27 ordering): the
              full-width headcount row first, then the two flow charts. */}
          <WorkforceCard
            report={data.report}
            range={data.range}
            preset={preset}
            retryTo={retryTo}
            hidden={hidden}
            onToggleHidden={toggleHidden}
          />
          <AttendanceTrendCard
            trend={data.trend}
            range={data.range}
            preset={preset}
            retryTo={retryTo}
            hidden={hidden}
            onToggleHidden={toggleHidden}
          />
          <JobsApprovalsCard
            report={data.report}
            range={data.range}
            preset={preset}
            retryTo={retryTo}
            hidden={hidden}
            onToggleHidden={toggleHidden}
          />
        </div>
      </SkeletonSlot>
    </>
  );
}

/** The mock's full-width subscription banner: plan chip, active pulse, the
 *  validity line and the billing note, with Manage Plan on the right. */
function SubscriptionBanner({ subscription }: { subscription: SubscriptionFacts }) {
  const { validUntil, planName, billingCycle, autoRenews } = subscription;
  const expired = isSubscriptionExpired(validUntil);
  return (
    <section className={styles.banner} aria-label="Subscription">
      <div className={styles.bannerLeft}>
        <span className={styles.bannerTitleCluster}>
          <span className={styles.bannerTitle}>Subscription</span>
          <span
            className={`${styles.bannerChip} ${
              expired ? styles.bannerChipExpired : styles.bannerChipActive
            }`}
          >
            <span className={styles.pulseDot} aria-hidden="true" />
            {expired ? "Expired" : "Active"}
          </span>
        </span>
        <span className={styles.bannerDivider} aria-hidden="true" />
        <span className={styles.planChip}>{planName} Plan</span>
        <span className={styles.bannerMeta}>
          {validUntil === null ? (
            "No end date is set for this company."
          ) : (
            <>
              Valid until <strong>{fmtIstDay(validUntil)}</strong>{" "}
              <span className={styles.bannerMetaSoft}>(India time)</span>
            </>
          )}
        </span>
        {validUntil !== null ? (
          <>
            <span className={styles.bannerDivider} aria-hidden="true" />
            <span className={styles.bannerMeta}>
              {billingCycle} Billing
              {autoRenews ? (
                <>
                  <span className={styles.bannerMetaSoft}> • </span>Auto-renews
                </>
              ) : null}
            </span>
          </>
        ) : null}
      </div>
      <div className={styles.bannerRight}>
        <Link to="/pricing" className={styles.managePlan}>
          Manage Plan
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/** ── Shared card pieces ─────────────────────────────────────── */

function CardHead({
  title,
  range,
  preset,
  controlsLabel,
}: {
  title: string;
  range: { from: string; to: string };
  preset: string;
  controlsLabel: string;
}) {
  return (
    <div className={styles.cardHead}>
      <div>
        <h3 className={styles.cardTitle}>{title}</h3>
      </div>
      <div className={styles.rangeControls}>
        {/* No chevron: the pill is a read-only label — the presets beside
            it are the period control (impeccable audit 2026-11-28: a chevron
            on a dead span promises a dropdown that does not exist). */}
        <span className={styles.datePill}>
          <CalendarDays size={14} aria-hidden="true" />
          <span>
            {fmtDayMonth(range.from)} – {fmtDayMonth(range.to)}
          </span>
        </span>
        <nav className={styles.presetGroup} aria-label={controlsLabel}>
          {PRESETS.map((link) => (
            <Link
              key={link.preset}
              to={`/admin/company?range=${link.preset}`}
              className={styles.presetLink}
              aria-current={preset === link.preset ? "page" : undefined}
              replace
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** The chart legends are series toggles (owner request, 2026-11-27): click a
 *  legend chip to hide or re-show that series. A hidden chip dims and its
 *  dot goes hollow but keeps its colour ring, so re-enabling stays
 *  discoverable. The values stay visible either way — they describe the
 *  whole window, not the drawn line. */
function Legend({
  items,
}: {
  items: Array<{
    key: string;
    label: string;
    color: string;
    value?: string;
    hidden?: boolean;
    onToggle?: () => void;
  }>;
}) {
  return (
    <div className={styles.legend}>
      {items.map((item) => {
        const body = (
          <>
            <span
              className={styles.legendDot}
              style={
                item.hidden
                  ? {
                      background: "transparent",
                      boxShadow: `inset 0 0 0 2px ${item.color}`,
                    }
                  : { background: item.color }
              }
              aria-hidden="true"
            />
            {item.label}
            {item.value !== undefined ? ` (${item.value})` : ""}
          </>
        );
        if (item.onToggle === undefined) {
          return (
            <span
              key={item.key}
              className={`${styles.legendItem} ${item.hidden ? styles.legendItemHidden : ""}`}
            >
              {body}
            </span>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            className={`${styles.legendItem} ${styles.legendToggle} ${
              item.hidden ? styles.legendItemHidden : ""
            }`}
            aria-pressed={!item.hidden}
            onClick={item.onToggle}
            title={item.hidden ? `Show ${item.label}` : `Hide ${item.label}`}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}

/** The per-card hidden-series state: a set of legend keys, toggled by the
 *  legend chips. */
function useHiddenSeries(): [ReadonlySet<string>, (key: string) => void] {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  return [hidden, toggle];
}

function FailedCard({ retryTo, what }: { retryTo: string; what: string }) {
  return (
    <p className={styles.failed} role="alert">
      {what}
      {/* The same address re-runs the loader — a custom range keeps its
          from/to instead of falling back to the default window. */}
      <Link to={retryTo} className={styles.retry}>
        Try again
      </Link>
    </p>
  );
}

/** Five axis ticks, evenly spread — the mock's five x-labels. The last one
 *  names today when the window ends on the server's today. */
function axisTicks(count: number): number[] {
  const last = Math.max(0, count - 1);
  return [0, 1, 2, 3, 4].map((k) => Math.round((k * last) / 4));
}

function axisLabels(dates: string[], endsToday: boolean): Array<{ index: number; text: string }> {
  return axisTicks(dates.length)
    .filter((index, i, all) => all.indexOf(index) === i)
    .map((index) => ({
      index,
      text:
        endsToday && index === dates.length - 1
          ? `${fmtDayMonth(dates[index])} (Today)`
          : fmtDayMonth(dates[index]),
    }));
}

function Axis({ dates, endsToday }: { dates: string[]; endsToday: boolean }) {
  return (
    <div className={styles.axisRow} aria-hidden="true">
      {axisLabels(dates, endsToday).map((tick) => (
        <span key={tick.index}>{tick.text}</span>
      ))}
    </div>
  );
}

function downloadCsv(
  filename: string,
  header: string[],
  rows: Array<Array<string | number>>,
): void {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // The same deferred revoke the export card uses — a synchronous one can
  // cancel the download before the browser fetches the blob (Safari).
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** One decimal, mock style — "92.4%" / "59.0%". Null reads an em dash. */
function oneDecimal(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(1)}%`;
}

/** ── Card 1: Attendance Trend ───────────────────────────────── */

function AttendanceTrendCard({
  trend,
  range,
  preset,
  retryTo,
  hidden,
  onToggleHidden,
}: {
  trend: Slice<AttendanceTrendResponse>;
  range: { from: string; to: string };
  preset: string;
  retryTo: string;
  hidden: ReadonlySet<string>;
  onToggleHidden: (key: string) => void;
}) {
  const endsToday = range.to === istToday();
  return (
    <article className={styles.chartCard}>
      <div>
        <CardHead
          title="Attendance Trend"
          range={range}
          preset={preset}
          controlsLabel="Attendance trend period"
        />
        {!trend.ok ? (
          <FailedCard
            retryTo={retryTo}
            what="The attendance trend could not load for this period."
          />
        ) : (
          <>
            <TrendLegend days={trend.data.days} hidden={hidden} onToggle={onToggleHidden} />
            <TrendChart
              ariaLabel="Daily attendance distribution across the period"
              series={[
                {
                  key: "tracked",
                  label: "Tracked",
                  color: COLORS.trackedLine,
                  values: trend.data.days.map((d) => d.tracked),
                  dashed: true,
                },
                {
                  key: "checkedIn",
                  label: "Checked in",
                  color: COLORS.checkedIn,
                  values: trend.data.days.map((d) => d.checkedIn),
                  area: true,
                  dotIndexes: axisTicks(trend.data.days.length),
                },
                {
                  key: "notCheckedIn",
                  label: "Not checked in",
                  color: COLORS.notChecked,
                  values: trend.data.days.map((d) => d.notCheckedIn),
                },
                {
                  key: "shortDay",
                  label: "Short day",
                  color: COLORS.shortDay,
                  values: trend.data.days.map((d) => d.shortDay),
                },
                {
                  key: "lateLeave",
                  label: "Late / leave",
                  color: COLORS.lateLeave,
                  values: trend.data.days.map((d) => d.late + d.onLeave),
                },
              ].filter((s) => !hidden.has(s.key))}
            />
            <Axis dates={trend.data.days.map((d) => d.date)} endsToday={endsToday} />
          </>
        )}
      </div>
      <div className={styles.cardFooter}>
        {trend.ok ? (
          <button
            type="button"
            className={styles.csvButton}
            onClick={() =>
              downloadCsv(
                `attendance-trend-${range.from}-to-${range.to}.csv`,
                [
                  "Date",
                  "Tracked",
                  "Checked in",
                  "Not checked in",
                  "Short day",
                  "Late",
                  "On leave",
                ],
                trend.data.days.map((d) => [
                  d.date,
                  d.tracked,
                  d.checkedIn,
                  d.notCheckedIn,
                  d.shortDay,
                  d.late,
                  d.onLeave,
                ]),
              )
            }
          >
            Download CSV
          </button>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}

/** The mock's legend semantics: the team size (the busiest day's tracked),
 *  per-day averages for the checked-in and not-checked buckets, and range
 *  totals for the short days and the late/leave rows — keyed to the series
 *  so a chip toggles its line. */
function TrendLegend({
  days,
  hidden,
  onToggle,
}: {
  days: AttendanceTrendDay[];
  hidden: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  const n = Math.max(1, days.length);
  const sum = (pick: (d: AttendanceTrendDay) => number) =>
    days.reduce((acc, d) => acc + pick(d), 0);
  const avg = (pick: (d: AttendanceTrendDay) => number) => Math.round((sum(pick) / n) * 10) / 10;
  const peakTracked = days.reduce((acc, d) => Math.max(acc, d.tracked), 0);
  return (
    <Legend
      items={[
        { key: "tracked", label: "Tracked", color: COLORS.tracked, value: String(peakTracked) },
        {
          key: "checkedIn",
          label: "Checked In",
          color: COLORS.checkedIn,
          value: `${avg((d) => d.checkedIn)} avg`,
        },
        {
          key: "notCheckedIn",
          label: "Not Checked",
          color: COLORS.notChecked,
          value: `${avg((d) => d.notCheckedIn)} avg`,
        },
        {
          key: "shortDay",
          label: "Short Day",
          color: COLORS.shortDay,
          value: String(sum((d) => d.shortDay)),
        },
        {
          key: "lateLeave",
          label: "Late / Leave",
          color: COLORS.lateLeave,
          value: String(sum((d) => d.late + d.onLeave)),
        },
      ].map((item) => ({
        ...item,
        hidden: hidden.has(item.key),
        onToggle: () => onToggle(item.key),
      }))}
    />
  );
}

/** ── Card 2: Jobs & Approvals ───────────────────────────────── */

const JOB_SERIES: Array<{
  key: keyof OwnerTrendSliceBucketCounts;
  label: string;
  /** The legend chip's wording (the mock's abbreviated forms). */
  legendLabel: string;
  color: string;
  area?: boolean;
}> = [
  {
    key: "employeeCreated",
    label: "Created by employees",
    legendLabel: "Created by Empl.",
    color: COLORS.employeeCreated,
    area: true,
  },
  {
    key: "ownerCreated",
    label: "Created by you",
    legendLabel: "Created by You",
    color: COLORS.ownerCreated,
  },
  {
    key: "employeeApproved",
    label: "Approved by you",
    legendLabel: "Approved by You",
    color: COLORS.approved,
  },
  {
    key: "employeeAutoApproved",
    label: "Auto-approved",
    legendLabel: "Auto-Approved",
    color: COLORS.autoApproved,
  },
];

interface OwnerTrendSliceBucketCounts {
  employeeCreated: number;
  employeeApproved: number;
  employeeAutoApproved: number;
  ownerCreated: number;
}

function JobsApprovalsCard({
  report,
  range,
  preset,
  retryTo,
  hidden,
  onToggleHidden,
}: {
  report: Slice<OwnerExecReportResponse>;
  range: { from: string; to: string };
  preset: string;
  retryTo: string;
  hidden: ReadonlySet<string>;
  onToggleHidden: (key: string) => void;
}) {
  const endsToday = range.to === istToday();
  const headline = report.ok ? report.data.headline : null;
  return (
    <article className={styles.chartCard}>
      <div>
        <CardHead
          title="Jobs & Approvals"
          range={range}
          preset={preset}
          controlsLabel="Jobs flow period"
        />
        {!report.ok ? (
          <FailedCard retryTo={retryTo} what="The report could not load for this period." />
        ) : (
          <>
            <Legend
              items={JOB_SERIES.map((s) => ({
                key: s.key,
                label: s.legendLabel,
                color: s.color,
                value: String(headline?.[s.key] ?? 0),
                hidden: hidden.has(s.key),
                onToggle: () => onToggleHidden(s.key),
              }))}
            />
            <TrendChart
              ariaLabel="Cumulative job flow across the period"
              series={JOB_SERIES.filter((s) => !hidden.has(s.key)).map((s) => ({
                key: s.key,
                label: s.label,
                color: s.color,
                area: s.area,
                values: report.data.trend.buckets.map((b) => b[s.key]),
                dotIndexes:
                  report.data.trend.buckets.length > 0
                    ? [report.data.trend.buckets.length - 1]
                    : [],
              }))}
            />
            <BucketAxis
              buckets={report.data.trend.buckets}
              endsToday={endsToday}
              spanDays={daySpan(range.from, range.to)}
            />
          </>
        )}
      </div>
      <div className={styles.cardFooter}>
        {report.ok ? (
          <>
            <span>
              Overall Turnaround efficiency:{" "}
              <span className={styles.footerStat}>
                {oneDecimal(report.data.trend.turnaroundEfficiency)}
              </span>
            </span>
            <Link to="/admin/company/employees" className={styles.footerLink}>
              Approval Rules
              <ChevronRight size={12} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}

function daySpan(from: string, to: string): number {
  return (
    Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
  );
}

/** The mock's weekly labels — "Week 1 (23 Oct)" — collapsing to plain dates
 *  when the window is too short to deserve the word "week". */
function bucketLabel(
  bucket: OwnerTrendSlice,
  index: number,
  isLast: boolean,
  endsToday: boolean,
  spanDays: number,
): string {
  if (isLast && endsToday) return `Today (${fmtDayMonth(bucket.to)})`;
  if (spanDays > 14) return `Week ${index + 1} (${fmtDayMonth(bucket.from)})`;
  return fmtDayMonth(bucket.from);
}

function BucketAxis({
  buckets,
  endsToday,
  spanDays,
}: {
  buckets: OwnerTrendSlice[];
  endsToday: boolean;
  spanDays: number;
}) {
  return (
    <div className={styles.axisRow} aria-hidden="true">
      {buckets.map((bucket, i) => (
        <span key={bucket.from}>
          {bucketLabel(bucket, i, i === buckets.length - 1, endsToday, spanDays)}
        </span>
      ))}
    </div>
  );
}

/** ── Card 3: Employee Overview & Analytics ──────────────────── */

function WorkforceCard({
  report,
  range,
  preset,
  retryTo,
  hidden,
  onToggleHidden,
}: {
  report: Slice<OwnerExecReportResponse>;
  range: { from: string; to: string };
  preset: string;
  retryTo: string;
  hidden: ReadonlySet<string>;
  onToggleHidden: (key: string) => void;
}) {
  const endsToday = range.to === istToday();
  return (
    <article className={`${styles.chartCard} ${styles.fullWidth}`}>
      <div>
        <CardHead
          title="Employee Overview & Analytics"
          range={range}
          preset={preset}
          controlsLabel="Workforce analytics period"
        />
        {!report.ok ? (
          <FailedCard retryTo={retryTo} what="The report could not load for this period." />
        ) : (
          <WorkforceBody
            buckets={report.data.workforce.buckets}
            endsToday={endsToday}
            hidden={hidden}
            onToggleHidden={onToggleHidden}
          />
        )}
      </div>
      <div className={styles.cardFooter}>
        {report.ok ? (
          <>
            <div className={styles.footerCluster}>
              <button
                type="button"
                className={styles.csvButton}
                onClick={() => {
                  const buckets = report.data.workforce.buckets;
                  downloadCsv(
                    `workforce-${range.from}-to-${range.to}.csv`,
                    [
                      "From",
                      "To",
                      "Total employees",
                      "Active employees",
                      "Pending invites",
                      "Needs approval",
                    ],
                    buckets.map((b) => [
                      b.from,
                      b.to,
                      b.totalEmployees,
                      b.activeEmployees,
                      b.pendingInvites,
                      b.needsApproval,
                    ]),
                  );
                }}
              >
                Download CSV
              </button>
              <span className={styles.footerSoft}>•</span>
              <span>
                Active workforce rate:{" "}
                <span className={styles.footerStat}>
                  {workforceRate(report.data.workforce.buckets.at(-1))}
                </span>
              </span>
            </div>
            <Link to="/admin/company/employees" className={styles.footerLink}>
              Manage Employees
              <ChevronRight size={12} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}

/** Render-time clock read, isolated at module scope (the same shape the
 *  console's istToday() uses): a banner's expiry is judged on the render
 *  instant — a re-render refreshes it, which is exactly what we want. */
function isSubscriptionExpired(validUntil: string | null): boolean {
  return validUntil !== null && new Date(validUntil).getTime() < Date.now();
}

function workforceRate(bucket: OwnerWorkforceBucket | undefined): string {
  if (bucket === undefined || bucket.totalEmployees === 0) return "—";
  return oneDecimal(bucket.activeEmployees / bucket.totalEmployees);
}

function WorkforceBody({
  buckets,
  endsToday,
  hidden,
  onToggleHidden,
}: {
  buckets: OwnerWorkforceBucket[];
  endsToday: boolean;
  hidden: ReadonlySet<string>;
  onToggleHidden: (key: string) => void;
}) {
  const last = buckets.at(-1);
  const dates = buckets.map((b) => b.to);
  const dotIndexes = [Math.max(0, buckets.length - 1)];
  // "Total Employees" owns TWO datasets — the dashed reference line and the
  // solid line riding it — so its chip toggles both.
  const isVisible = (key: string) =>
    key === "totalLine" ? !hidden.has("total") : !hidden.has(key);
  return (
    <>
      <Legend
        items={[
          {
            key: "total",
            label: "Total Employees",
            color: COLORS.employeeCreated,
            value: String(last?.totalEmployees ?? 0),
          },
          {
            key: "active",
            label: "Active Employees",
            color: COLORS.checkedIn,
            value: String(last?.activeEmployees ?? 0),
          },
          {
            key: "invites",
            label: "Pending Invites",
            color: COLORS.notChecked,
            value: String(last?.pendingInvites ?? 0),
          },
          {
            key: "needsApproval",
            label: "Needs Approval",
            color: COLORS.ownerCreated,
            value: String(last?.needsApproval ?? 0),
          },
        ].map((item) => ({
          ...item,
          hidden: hidden.has(item.key),
          onToggle: () => onToggleHidden(item.key),
        }))}
      />
      <TrendChart
        ariaLabel="Workforce headcounts, invites and pending approvals across the period"
        series={[
          {
            key: "totalLine",
            label: "Total employees",
            color: COLORS.trackedLine,
            values: buckets.map((b) => b.totalEmployees),
            dashed: true,
          },
          {
            key: "total",
            label: "Total employees",
            color: COLORS.employeeCreated,
            values: buckets.map((b) => b.totalEmployees),
            dotIndexes,
          },
          {
            key: "active",
            label: "Active employees",
            color: COLORS.checkedIn,
            values: buckets.map((b) => b.activeEmployees),
            area: true,
            dotIndexes,
          },
          {
            key: "invites",
            label: "Pending invites",
            color: COLORS.notChecked,
            values: buckets.map((b) => b.pendingInvites),
            dotIndexes,
          },
          {
            key: "needsApproval",
            label: "Needs approval",
            color: COLORS.ownerCreated,
            values: buckets.map((b) => b.needsApproval),
            dotIndexes,
          },
        ].filter((s) => isVisible(s.key))}
      />
      <Axis dates={dates} endsToday={endsToday} />
    </>
  );
}

/** ── Loading + shell ────────────────────────────────────────── */

/** The dashboard region's stand-in: three card-shaped blocks (two half, one
 *  full) — the footprint the loaded charts fill. */
function DashSkeleton() {
  return (
    <div className={styles.dashSkeleton}>
      {/* Same order as the loaded cards: the full-width workforce card
          first, then the two flow charts side by side. */}
      <div className={`${styles.skeletonCard} ${styles.fullWidth}`}>
        <SkeletonRow cells={["220px", "260px"]} height={26} />
        <SkeletonRow cells={["80%", "60%", "70%", "50%"]} height={14} />
        <SkeletonRow cells={["100%", "100%", "100%"]} height={40} />
        <SkeletonRow cells={["100%", "100%", "100%", "100%"]} height={40} />
        <SkeletonRow cells={["100%", "100%", "100%", "100%"]} height={40} />
      </div>
      <div className={styles.skeletonCard}>
        <SkeletonRow cells={["140px", "220px"]} height={26} />
        <SkeletonRow cells={["80%", "60%", "70%", "50%"]} height={14} />
        <SkeletonRow cells={["100%", "100%", "100%"]} height={40} />
        <SkeletonRow cells={["100%", "100%", "100%", "100%"]} height={40} />
      </div>
      <div className={styles.skeletonCard}>
        <SkeletonRow cells={["140px", "220px"]} height={26} />
        <SkeletonRow cells={["80%", "60%", "70%", "50%"]} height={14} />
        <SkeletonRow cells={["100%", "100%", "100%"]} height={40} />
        <SkeletonRow cells={["100%", "100%", "100%", "100%"]} height={40} />
      </div>
    </div>
  );
}

/** The page's top bar: the breadcrumb. */
function TopBar() {
  return (
    <div className={styles.topBar}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link to="/admin" className={styles.crumbRoot}>
          Console
        </Link>
        <span className={styles.crumbSep} aria-hidden="true">
          ›
        </span>
        <span className={styles.crumbHere} aria-current="page">
          Overview
        </span>
      </nav>
    </div>
  );
}
