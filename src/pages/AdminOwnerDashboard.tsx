import { Link, useLocation, useNavigation, useSearchParams } from "react-router";
import { StatTiles } from "../features/admin/components/StatTiles";
import { SectionCard } from "../features/admin/components/SectionCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import type { OwnerDashboard } from "../features/admin/adminLoader";
import type { OwnerReportResponse } from "../features/admin/jobReportsApi";
import styles from "./AdminOwnerDashboard.module.css";

/**
 * The owner's reports dashboard (Epic 22, CAP-8): the landing view at /admin
 * for a company admin. Headline counts, the approval pipeline, the
 * per-employee breakdown and the employees-with-permission list — all
 * computed server-side for the chosen date range (preset links re-run the
 * loader; the page holds no server data in state).
 *
 * Trends and the owner/employee mix from reports-dashboard.md are not served
 * by the backend yet; the dashboard shows everything the report returns
 * (deferred work, recorded in the ledger).
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

function day(iso: string): string {
  return iso.slice(0, 10);
}

export function AdminOwnerDashboard({ dashboard }: { dashboard: OwnerDashboard }) {
  // The preset links re-run the layout loader; the URL still says which one
  // is current, so the highlight follows it (a custom range highlights none).
  const [searchParams] = useSearchParams();
  const preset = searchParams.get("range") ?? "30";
  const search = searchParams.toString();
  const sameAddress = search !== "" ? `/admin?${search}` : "/admin";

  const { report, range } = dashboard;
  const meta = `${day(range.from)} – ${day(range.to)}`;

  if (!report.ok) {
    return (
      <>
        <RangeNav current={preset} />
        <SectionCard title="Job reports" meta={meta}>
          <p className={styles.failed} role="alert">
            The report could not load for this period.
            {/* The same address re-runs the loader — a custom range keeps
                its from/to instead of falling back to the default window. */}
            <Link to={sameAddress} className={styles.retry}>
              Try again
            </Link>
          </p>
        </SectionCard>
      </>
    );
  }

  return (
    <>
      <RangeNav current={preset} />
      <OwnerDashboardBody report={report.data} rangeMeta={meta} />
      <DashboardLoadingLine />
    </>
  );
}

/** A quiet status line while a navigation to /admin itself is refetching the
 *  report — the previous numbers stay until the new range arrives. */
function DashboardLoadingLine() {
  const navigation = useNavigation();
  const { pathname } = useLocation();
  if (
    navigation.state !== "loading" ||
    navigation.location.pathname !== "/admin" ||
    pathname !== "/admin"
  ) {
    return null;
  }
  return (
    <p className={styles.quiet} role="status">
      Loading the report…
    </p>
  );
}

function RangeNav({ current }: { current: string }) {
  return (
    <nav className={styles.rangeNav} aria-label="Report period">
      {RANGE_LINKS.map((link) => (
        <Link
          key={link.preset}
          to={`/admin?range=${link.preset}`}
          className={styles.rangeLink}
          aria-current={current === link.preset ? "page" : undefined}
          replace
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function OwnerDashboardBody({
  report,
  rangeMeta,
}: {
  report: OwnerReportResponse;
  rangeMeta: string;
}) {
  const p = report.pipeline;
  return (
    <div className={styles.stack}>
      <StatTiles
        tiles={[
          { label: "Created by employees", value: report.headline.employeeCreated },
          { label: "Approved by you", value: report.headline.employeeApproved },
          { label: "Auto-approved", value: report.headline.employeeAutoApproved },
          { label: "Created by you", value: report.headline.ownerCreated },
        ]}
      />

      <div className={styles.pair}>
        <SectionCard title="Approval queue" meta={String(p.pending)}>
          <div className={styles.factGrid}>
            <Fact label="Waiting over 24 h" value={String(p.pendingOverOneDay)} />
            <Fact
              label="Oldest pending"
              value={p.oldestPending ? p.oldestPending.jobNumber : "—"}
            />
          </div>
          {p.pending > 0 ? (
            <Link to="/admin/company/jobs?tab=approval" className={styles.queueLink}>
              Open the approval queue
            </Link>
          ) : null}
        </SectionCard>

        <SectionCard title="Approval rate" meta={percent(p.approvalRate)}>
          <div className={styles.factGrid}>
            <Fact label="Rejected" value={String(p.rejected)} />
            <Fact label="With a reason" value={String(p.rejectedWithReason)} />
            <Fact label="Without a reason" value={String(p.rejectedWithoutReason)} />
            <Fact label="Average wait" value={minutesLabel(p.averageMinutesToDecision)} />
            <Fact label="Median wait" value={minutesLabel(p.medianMinutesToDecision)} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Per employee" meta={rangeMeta}>
        <DataTable
          columns={["Employee", "Created", "Approved", "Auto", "Rejected", "Pending", "Share"]}
          empty="No employee created a job in this period."
          rows={report.perEmployee.map((row): TableCell[] => [
            { text: row.name ?? "(no name)" },
            { text: String(row.created) },
            { text: String(row.approved) },
            { text: String(row.autoApproved) },
            { text: String(row.rejected) },
            { text: String(row.pending) },
            { text: percent(row.shareOfEmployeeCreated), quiet: true },
          ])}
        />
      </SectionCard>

      <SectionCard
        title="Can create jobs, none created yet"
        meta={String(report.employeesWithPermissionNoJobs.length)}
      >
        {report.employeesWithPermissionNoJobs.length === 0 ? (
          <p className={styles.quiet}>Every employee with permission created at least one job.</p>
        ) : (
          <ul className={styles.nameList}>
            {report.employeesWithPermissionNoJobs.map((row) => (
              <li key={row.employeeId}>{row.name ?? "(no name)"}</li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
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
