import { Link, useLoaderData, useLocation, useNavigation, useRevalidator } from "react-router";
import type { adminCompanyLoader } from "../features/admin/adminCompanyLoader";
import type { OwnerReportResponse } from "../features/admin/jobReportsApi";
import type { Slice } from "../features/admin/slice";
import { SectionCard } from "../features/admin/components/SectionCard";
import { ConsoleTiles, type ConsoleTile } from "../features/admin/components/ConsoleTiles";
import { LinkCard } from "../features/admin/components/LinkCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { AttendanceArt } from "../features/admin/components/art/AttendanceArt";
import { CustomersArt } from "../features/admin/components/art/CustomersArt";
import { HolidaysArt } from "../features/admin/components/art/HolidaysArt";
import { JobsArt } from "../features/admin/components/art/JobsArt";
import { TeamArt } from "../features/admin/components/art/TeamArt";
import { fmtDay, fmtIstDay } from "../features/admin/format";
import {
  ApprovalTagIcon,
  BellIcon,
  ClipboardListIcon,
  CrownIcon,
  EditIcon,
  UserCheckIcon,
  UserIcon,
  UsersIcon,
  ZapIcon,
} from "../components/ui/consoleIcons";
import styles from "./AdminCompanyPage.module.css";

/** The report period's presets, newest-first wording, the same five the old
 *  /admin dashboard offered — plain links, so the address stays shareable. */
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

/** The owner's overview — the console's one landing page. The old /admin
 *  dashboard (Epic 22, CAP-8) and this page said the same things twice, so
 *  they are merged here: today's pulse, the job report with its period
 *  presets, the leave list and the subscription line. The audit trail is
 *  gone by owner decision — the inspect dossier and the payroll runs keep
 *  their own records where they belong. */
export function AdminCompanyPage() {
  const data = useLoaderData<typeof adminCompanyLoader>();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const busy = revalidator.state !== "idle" || navigation.state !== "idle";
  // The report's preset is read from the address on every render — a preset
  // link is navigation, and the loader refetches the report for it.
  const location = useLocation();
  const preset = new URLSearchParams(location.search).get("range") ?? "30";

  if (data.state === "failed") {
    return (
      <>
        <TopBar />
        <div className={styles.stack}>
          <SectionCard title="Company data">
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
          </SectionCard>
        </div>
      </>
    );
  }

  const pulseTiles: ConsoleTile[] = data.pulse.ok
    ? [
        {
          label: "Tracked",
          value: data.pulse.data.counts.tracked,
          icon: UsersIcon,
          tone: "primary",
        },
        {
          label: "Checked in",
          value: data.pulse.data.counts.checkedIn,
          icon: UserCheckIcon,
          tone: "done",
        },
        {
          label: "Not checked in",
          value: data.pulse.data.counts.notCheckedIn,
          icon: UserIcon,
          tone: "scheduled",
        },
        {
          label: "Short day",
          value: data.pulse.data.counts.shortDay,
          icon: ClipboardListIcon,
          tone: "violet",
        },
        { label: "Late", value: data.pulse.data.counts.late, icon: BellIcon, tone: "scheduled" },
        {
          label: "On leave",
          value: data.pulse.data.counts.onLeave,
          icon: ApprovalTagIcon,
          tone: "violet",
        },
      ]
    : [];

  return (
    <>
      <TopBar />
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.heading}>
            {data.selfName === null ? "Hello" : `Hello, ${data.selfName}`}
            <span className={styles.rolePill}>
              <CrownIcon size={13} className={styles.rolePillIcon} />
              Owner
            </span>
          </h1>
          <p className={styles.lede}>
            Today's pulse, the job report and every list in your company — one page.
          </p>
        </div>
      </header>
      {data.pulse.ok ? (
        <>
          <p className={styles.dateLine}>
            Today, {fmtDay(data.pulse.data.date)}
            {data.pulse.data.flags.checkoutMissing.length +
              data.pulse.data.flags.fakeLocationAttempt.length >
            0 ? (
              <span className={styles.flagLine}>
                {" "}
                · {data.pulse.data.flags.checkoutMissing.length} missing check-out
                {data.pulse.data.flags.fakeLocationAttempt.length > 0
                  ? ` · ${data.pulse.data.flags.fakeLocationAttempt.length} suspect location attempt${data.pulse.data.flags.fakeLocationAttempt.length === 1 ? "" : "s"}`
                  : ""}
              </span>
            ) : null}
          </p>
          <ConsoleTiles tiles={pulseTiles} />
        </>
      ) : (
        <SectionCard title="Today's pulse">
          <p className={styles.failed} role="alert">
            The pulse could not load.
            <button
              type="button"
              className={styles.retry}
              onClick={() => revalidator.revalidate()}
              disabled={busy}
            >
              {busy ? "Retrying…" : "Retry"}
            </button>
          </p>
        </SectionCard>
      )}

      <div className={styles.cards}>
        <LinkCard
          to="/admin/company/customers"
          label="Customers"
          note="Everyone who buys from you"
          art={<CustomersArt />}
        />
        <LinkCard
          to="/admin/company/employees"
          label="Employees"
          note="Your full team"
          count={data.members.ok ? data.members.data.length : undefined}
          art={<TeamArt />}
        />
        <LinkCard
          to="/admin/company/jobs"
          label="Jobs"
          note="Every job, newest first"
          art={<JobsArt />}
        />
        <LinkCard
          to="/admin/company/holidays"
          label="Holidays"
          note="Upcoming and past"
          art={<HolidaysArt />}
        />
        <LinkCard
          to="/admin/company/attendance"
          label="Attendance"
          note="This month, per employee"
          art={<AttendanceArt />}
        />
      </div>

      <JobReport
        report={data.report}
        range={data.range}
        preset={preset}
        retryTo={`${location.pathname}${location.search}`}
      />

      <div className={styles.pair}>
        {data.leave.ok ? (
          <SectionCard title="Leave" meta={String(data.leave.data.length)}>
            <DataTable
              columns={["Employee", "From", "To", "Days", "State"]}
              empty="No leave requests."
              rows={data.leave.data.map((l): TableCell[] => [
                { text: l.employeeName ?? l.employeeCode ?? l.id },
                { text: fmtDay(l.startDate) },
                { text: fmtDay(l.endDate) },
                { text: `${l.workingDays} of ${l.totalDays}` },
                { text: l.status, status: true },
              ])}
            />
          </SectionCard>
        ) : null}

        <SectionCard title="Subscription">
          <p className={styles.dateLine}>
            {data.validUntil
              ? `Valid until ${fmtIstDay(data.validUntil)} (India time).`
              : "No end date is set for this company. Contact Fenzit support."}
          </p>
        </SectionCard>
      </div>
    </>
  );
}

/** The job report (the old dashboard's body): headline counts, the approval
 *  pipeline, the per-employee breakdown and the employees-with-permission
 *  list — all computed server-side for the chosen range; the preset links
 *  navigate and the loader refetches. A failed report degrades to its own
 *  retry card; the overview around it still works. */
function JobReport({
  report,
  range,
  preset,
  retryTo,
}: {
  report: Slice<OwnerReportResponse>;
  range: { from: string; to: string };
  preset: string;
  /** The page's current address, search included — the retry link's target. */
  retryTo: string;
}) {
  const meta = `${day(range.from)} – ${day(range.to)}`;

  if (!report.ok) {
    return (
      <>
        <RangeNav current={preset} />
        <SectionCard title="Job report" meta={meta}>
          <p className={styles.failed} role="alert">
            The report could not load for this period.
            {/* The same address re-runs the loader — a custom range keeps
                its from/to instead of falling back to the default window. */}
            <Link to={retryTo} className={styles.retry}>
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
      <ReportBody report={report.data} rangeMeta={meta} />
    </>
  );
}

function RangeNav({ current }: { current: string }) {
  return (
    <nav className={styles.rangeNav} aria-label="Report period">
      {RANGE_LINKS.map((link) => (
        <Link
          key={link.preset}
          to={`/admin/company?range=${link.preset}`}
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

function ReportBody({ report, rangeMeta }: { report: OwnerReportResponse; rangeMeta: string }) {
  const p = report.pipeline;
  const tiles: ConsoleTile[] = [
    {
      label: "Created by employees",
      value: report.headline.employeeCreated,
      icon: EditIcon,
      tone: "primary",
    },
    {
      label: "Approved by you",
      value: report.headline.employeeApproved,
      icon: UserCheckIcon,
      tone: "done",
    },
    {
      label: "Auto-approved",
      value: report.headline.employeeAutoApproved,
      icon: ZapIcon,
      tone: "scheduled",
    },
    {
      label: "Created by you",
      value: report.headline.ownerCreated,
      icon: CrownIcon,
      tone: "violet",
    },
  ];
  return (
    <>
      <ConsoleTiles tiles={tiles} />
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
