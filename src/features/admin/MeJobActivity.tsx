import { Link, useLocation, useNavigation } from "react-router";
import { SectionCard } from "./components/SectionCard";
import { StatTiles } from "./components/StatTiles";
import { DataTable, type TableCell } from "./components/Table";
import { fmtDay, istDateInput } from "./format";
import type { EmployeeReportResponse } from "./jobReportsApi";
import type { RejectedJobRow } from "./meApi";
import type { Slice } from "./slice";
import styles from "./MeJobActivity.module.css";

/**
 * The employee dashboard's "My job activity" block (Epic 22, CAP-8): my
 * created-job outcomes for the chosen period, my approval rate and wait,
 * what is assigned now and what I completed, and the rejection reasons I
 * received — then my rejected jobs, all time (CAP-7, no expiry). The range
 * toggle and the rejected-history page are plain navigation (?range=,
 * ?rejectedCursor=).
 */

const RANGE_LINKS: Array<{ preset: string; label: string }> = [
  { preset: "today", label: "Today" },
  { preset: "7", label: "Last 7 days" },
  { preset: "30", label: "Last 30 days" },
  { preset: "this-month", label: "This month" },
  { preset: "last-month", label: "Last month" },
];

function percent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function minutesLabel(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours * 10) / 10} h`;
  return `${Math.round((hours / 24) * 10) / 10} d`;
}

/** A UTC instant as the calendar day it fell on in IST (the server's day),
 *  shown as "14 Nov 2026". */
function day(iso: string | null): string {
  const ist = istDateInput(iso);
  return ist === "" ? "—" : fmtDay(ist);
}

export function MeJobActivity({
  report,
  reportPreset,
  rejected,
  rejectedMore,
  rejectedNext,
}: {
  report: Slice<EmployeeReportResponse>;
  reportPreset: string;
  rejected: Slice<RejectedJobRow[]>;
  rejectedMore: boolean;
  rejectedNext: string | null;
}) {
  return (
    <>
      <SectionCard
        title="My job activity"
        meta={
          report.ok
            ? `${fmtDay(report.data.range.from)} – ${fmtDay(report.data.range.to)}`
            : undefined
        }
      >
        <nav className={styles.rangeNav} aria-label="Activity period">
          {RANGE_LINKS.map((link) => (
            <Link
              key={link.preset}
              to={`/admin/me?range=${link.preset}`}
              className={styles.rangeLink}
              aria-current={reportPreset === link.preset ? "page" : undefined}
              replace
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <LoadingLine label="Loading the activity…" path="/admin/me" />
        {report.ok ? (
          <MeReportBody report={report.data} />
        ) : (
          <p className={styles.quiet} role="alert">
            Your job activity could not load for this period.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="My rejected jobs"
        meta={
          rejected.ok
            ? rejectedMore
              ? `${rejected.data.length}+`
              : String(rejected.data.length)
            : undefined
        }
      >
        {rejected.ok ? (
          rejected.data.length === 0 ? (
            <p className={styles.quiet}>
              Nothing of yours was rejected. Newer decisions appear here.
            </p>
          ) : (
            <>
              <DataTable
                columns={["Job", "Task", "Reason", "Decided", "Was scheduled"]}
                empty="Nothing of yours was rejected."
                rows={rejected.data.map((row): TableCell[] => [
                  { text: row.jobNumber },
                  { text: row.description, quiet: true },
                  { text: row.rejectionReason ?? "No reason given" },
                  { text: day(row.decidedAt), quiet: true },
                  { text: day(row.scheduledStart), quiet: true },
                ])}
              />
              {rejectedMore && rejectedNext !== null ? (
                <p className={styles.moreLine}>
                  {/* The activity period rides along: walking the rejected
                      history must not reset the report window. */}
                  <Link
                    to={`/admin/me?range=${encodeURIComponent(reportPreset)}&rejectedCursor=${encodeURIComponent(rejectedNext)}`}
                    className={styles.moreLink}
                  >
                    Load older rejections
                  </Link>
                </p>
              ) : null}
            </>
          )
        ) : (
          <p className={styles.quiet} role="alert">
            Your rejected jobs could not load.
          </p>
        )}
      </SectionCard>
    </>
  );
}

function MeReportBody({ report }: { report: EmployeeReportResponse }) {
  const c = report.created;
  return (
    <>
      <StatTiles
        tiles={[
          { label: "I created", value: c.created },
          { label: "Approved", value: c.approved },
          { label: "Auto-approved", value: c.autoApproved },
          { label: "Rejected", value: c.rejected },
          { label: "Waiting", value: c.pending },
        ]}
      />
      <div className={styles.factGrid}>
        <Fact label="Approval rate" value={percent(report.approvalRate)} />
        <Fact label="Average wait" value={minutesLabel(report.averageMinutesToDecision)} />
        <Fact label="Median wait" value={minutesLabel(report.medianMinutesToDecision)} />
        <Fact label="Assigned to me now" value={String(report.assignedNow)} />
        <Fact label="I completed in this period" value={String(report.completedInRange)} />
      </div>
      {report.rejectionReasons.length > 0 ? (
        <div className={styles.reasons}>
          <p className={styles.reasonsTitle}>Rejection reasons I received, newest first</p>
          <ul className={styles.reasonList}>
            {report.rejectionReasons.map((r) => (
              <li key={r.jobId} className={styles.reasonItem}>
                <span className={styles.reasonJob}>{r.jobNumber}</span>
                <span className={styles.reasonBody}>{r.reason ?? "No reason given"}</span>
                <span className={styles.reasonDay}>{day(r.decidedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.rejectionReasonsTotal > report.rejectionReasons.length ? (
        <p className={styles.moreLine}>
          Showing the {report.rejectionReasons.length} newest of {report.rejectionReasonsTotal}{" "}
          rejections in this period — the full history is in "My rejected jobs" below.
        </p>
      ) : null}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <p className={styles.factLabel}>{label}</p>
      <p className={styles.factValue}>{value}</p>
    </div>
  );
}

/** A quiet status line while a navigation to this same page is refetching the
 *  card's data — the previous numbers stay on screen until the new ones
 *  arrive. Navigations to other pages do not turn it on. */
function LoadingLine({ label, path }: { label: string; path: string }) {
  const navigation = useNavigation();
  const { pathname } = useLocation();
  if (
    navigation.state !== "loading" ||
    navigation.location.pathname !== pathname ||
    pathname !== path
  ) {
    return null;
  }
  return (
    <p className={styles.quiet} role="status">
      {label}
    </p>
  );
}
