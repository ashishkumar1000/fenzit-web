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
 * The jobs page's two member tabs (Epic 22, CAP-7/CAP-8): "My report" — my
 * created-job outcomes for the chosen period, my approval rate and wait, and
 * the rejection reasons I received — and "Rejected" — my rejected jobs, all
 * time (no expiry). The range toggle and the rejected-history page are plain
 * navigation (?range=, ?rejectedCursor=) and keep their tab in the address.
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
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours * 10) / 10} hours`;
  return `${Math.round((hours / 24) * 10) / 10} days`;
}

/** A UTC instant as the calendar day it fell on in IST (the server's day),
 *  shown as "14 Nov 2026". */
function day(iso: string | null): string {
  const ist = istDateInput(iso);
  return ist === "" ? "—" : fmtDay(ist);
}

export function MeReportCard({
  report,
  reportPreset,
  basePath,
}: {
  report: Slice<EmployeeReportResponse>;
  reportPreset: string;
  basePath: string;
}) {
  return (
    <SectionCard
      title="My Job Activity"
      meta={
        report.ok
          ? `${fmtDay(report.data.range.from)} to ${fmtDay(report.data.range.to)}`
          : undefined
      }
    >
      <nav className={styles.rangeNav} aria-label="Activity period">
        {RANGE_LINKS.map((link) => (
          <Link
            key={link.preset}
            to={`${basePath}?tab=report&range=${link.preset}`}
            className={styles.rangeLink}
            aria-current={reportPreset === link.preset ? "page" : undefined}
            replace
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <LoadingLine label="Loading your job activity…" path={basePath} />
      {report.ok ? (
        <MeReportBody report={report.data} />
      ) : (
        <p className={styles.quiet} role="alert">
          We could not load your job activity for this period.
        </p>
      )}
    </SectionCard>
  );
}

export function MeRejectedCard({
  rejected,
  rejectedMore,
  rejectedNext,
  reportPreset,
  basePath,
}: {
  rejected: Slice<RejectedJobRow[]>;
  rejectedMore: boolean;
  rejectedNext: string | null;
  /** The activity period, kept when walking the rejected history. */
  reportPreset: string;
  basePath: string;
}) {
  return (
    <SectionCard
      title="My Rejected Jobs"
      meta={
        rejected.ok
          ? rejectedMore
            ? `${rejected.data.length}+ jobs`
            : String(rejected.data.length)
          : undefined
      }
    >
      {rejected.ok ? (
        rejected.data.length === 0 ? (
          <p className={styles.quiet}>
            None of your jobs have been rejected. New decisions will appear here.
          </p>
        ) : (
          <>
            <DataTable
              columns={[
                "Job",
                "Work Details",
                "Reason for Rejection",
                "Decision Date",
                "Scheduled Date",
              ]}
              empty="None of your jobs have been rejected. New decisions will appear here."
              rows={rejected.data.map((row): TableCell[] => [
                { text: row.jobNumber },
                { text: row.description, quiet: true },
                { text: row.rejectionReason ?? "No reason given." },
                { text: day(row.decidedAt), quiet: true },
                { text: day(row.scheduledStart), quiet: true },
              ])}
            />
            {rejectedMore && rejectedNext !== null ? (
              <p className={styles.moreLine}>
                {/* The activity period rides along: walking the rejected
                    history must not reset the report window. */}
                <Link
                  to={`${basePath}?tab=rejected&range=${encodeURIComponent(reportPreset)}&rejectedCursor=${encodeURIComponent(rejectedNext)}`}
                  className={styles.moreLink}
                >
                  Load Older Rejected Jobs
                </Link>
              </p>
            ) : null}
          </>
        )
      ) : (
        <p className={styles.quiet} role="alert">
          We could not load your rejected jobs.
        </p>
      )}
    </SectionCard>
  );
}

function MeReportBody({ report }: { report: EmployeeReportResponse }) {
  const c = report.created;
  return (
    <>
      <StatTiles
        tiles={[
          { label: "Jobs I Created", value: c.created },
          { label: "Approved Jobs", value: c.approved },
          { label: "Automatically Approved Jobs", value: c.autoApproved },
          { label: "Rejected Jobs", value: c.rejected },
          { label: "Waiting for Approval", value: c.pending },
        ]}
      />
      <div className={styles.factGrid}>
        <Fact label="Approval Rate" value={percent(report.approvalRate)} />
        <Fact label="Average Waiting Time" value={minutesLabel(report.averageMinutesToDecision)} />
        <Fact label="Usual Waiting Time" value={minutesLabel(report.medianMinutesToDecision)} />
        <Fact label="Jobs Currently Assigned to Me" value={String(report.assignedNow)} />
        <Fact label="Jobs I Completed During This Period" value={String(report.completedInRange)} />
      </div>
      {report.rejectionReasons.length > 0 ? (
        <div className={styles.reasons}>
          <p className={styles.reasonsTitle}>Why My Jobs Were Rejected (Newest First)</p>
          <ul className={styles.reasonList}>
            {report.rejectionReasons.map((r) => (
              <li key={r.jobId} className={styles.reasonItem}>
                <span className={styles.reasonJob}>{r.jobNumber}</span>
                <span className={styles.reasonBody}>{r.reason ?? "No reason given."}</span>
                <span className={styles.reasonDay}>{day(r.decidedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.rejectionReasonsTotal > report.rejectionReasons.length ? (
        <p className={styles.moreLine}>
          Showing the {report.rejectionReasons.length} latest rejected jobs out of{" "}
          {report.rejectionReasonsTotal}. See the Rejected Jobs tab for the full list.
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
