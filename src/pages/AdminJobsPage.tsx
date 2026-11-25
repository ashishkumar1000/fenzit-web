import { useState } from "react";
import { Link, useLoaderData, useLocation, useNavigation, useRevalidator } from "react-router";
import type { adminJobsLoader } from "../features/admin/adminBrowseLoaders";
import { humanize } from "../features/admin/status";
import { SectionCard } from "../features/admin/components/SectionCard";
import { DataTable, TableSkeleton, type TableCell } from "../features/admin/components/Table";
import { Tabs } from "../features/admin/components/Tabs";
import { fmtWhen } from "../features/admin/format";
import { MemberJobsCards } from "../features/admin/MemberJobsCards";
import { ApprovalQueueSection } from "../features/admin/ApprovalQueueSection";
import { LatestJobActivity } from "../features/admin/LatestJobActivity";
import { MeReportCard, MeRejectedCard } from "../features/admin/MeJobActivity";
import { ReportExportCard } from "../features/admin/ReportExportCard";
import { ConsoleTiles, type ConsoleTile } from "../features/admin/components/ConsoleTiles";
import { JobsTable } from "../features/admin/components/JobsTable";
import { ExportJobsButton } from "../features/admin/components/JobsExport";
import { JobsCreateBanner } from "../features/admin/components/JobsCreateBanner";
import {
  ClearAllButton,
  PriorityDropdown,
  SearchBox,
  SkillDropdown,
  SortDropdown,
  StatusChips,
} from "../features/admin/components/JobsFilterBar";
import { Pager, RowsPerPage } from "../features/admin/components/JobsPager";
import { JOB_STATUS_WORDS } from "../features/admin/jobsLabels";
import type { JobRow } from "../features/admin/companyApi";
import {
  ApprovalTagIcon,
  BellIcon,
  ClipboardListIcon,
  CrownIcon,
  ZapIcon,
} from "../components/ui/consoleIcons";
import styles from "./AdminJobsPage.module.css";

const JOBS_PATH = "/admin/company/jobs";

/** Each page's panels, one tab each — the tab change is navigation
 *  (`?tab=`), and the loader fetches only the active tab's data. */
const OWNER_TABS = [
  { value: "jobs", label: "All Jobs" },
  { value: "approval", label: "Approvals" },
  { value: "activity", label: "Job Activity" },
  { value: "report", label: "Reports" },
];
const MEMBER_TABS = [
  { value: "jobs", label: "My Jobs" },
  { value: "report", label: "My Report" },
  { value: "rejected", label: "Rejected Jobs" },
  { value: "activity", label: "Job Activity" },
];

/** The step column: "Step 2 of 5" once the job is on the template, the raw
 *  step's words before that, "—" on a fresh job. An index beyond the
 *  template (it shrank after the job started) falls back to the step's
 *  words — never "Step 7 of 5". */
function stepCell(job: JobRow): string {
  if (
    job.currentStepIndex !== null &&
    job.workflowTemplate !== null &&
    job.currentStepIndex < job.workflowTemplate.steps.length
  ) {
    return `Step ${job.currentStepIndex + 1} of ${job.workflowTemplate.steps.length}`;
  }
  return job.currentStep === null ? "—" : humanize(job.currentStep);
}

/** The member table's Job cell: the work leads, and the line under it
 *  answers "which job" — its number, or the location when there is no
 *  description. A rejected job shows the owner's reason instead (or that
 *  none was given). */
function jobCell(job: JobRow): TableCell {
  const sub =
    job.status === "rejected"
      ? job.description !== null
        ? `${job.rejectionReason ?? "No reason given."} – Job Number: ${job.jobNumber}`
        : (job.rejectionReason ?? "No reason given.")
      : job.description !== null
        ? job.jobNumber
        : job.serviceLocation;
  return {
    text: job.jobNumber,
    node: (
      <Link to={`${JOBS_PATH}/${job.id}`} className={styles.jobLink}>
        <span className={styles.jobTitle}>{job.description ?? job.jobNumber}</span>
        <span className={styles.jobSub}>{sub}</span>
      </Link>
    ),
  };
}

/** Client-side text search over the member's loaded rows — the job's own
 *  words, its people, its skill, its place. Case-blind; an empty query keeps
 *  all. (The owner's table searches in the database instead.) */
function matches(job: JobRow, query: string): boolean {
  const haystack = [
    job.jobNumber,
    job.description ?? "",
    job.customer?.name ?? "",
    job.technician?.name ?? "",
    job.skill?.name ?? "",
    job.serviceLocation,
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

/** The per-status empty lines: each status in its own natural words, since
 *  splicing the chip title into "No … jobs." read broken. */
const EMPTY_STATUS_LINES: Record<string, string> = {
  scheduled: "No scheduled jobs.",
  in_progress: "No jobs in progress.",
  pending_approval: "No jobs waiting for approval.",
  completed: "No completed jobs.",
  cancelled: "No cancelled jobs.",
  rejected: "No rejected jobs.",
};

/** The member's jobs table, the first tab for a signed-in member: chips
 *  riding `?status=`, a client-side search box, and the `?sort=` toggle —
 *  the legacy list contract (the server self-scopes job.read_own and the
 *  cursor endpoint stays the member's data source). */
function MemberJobsSection({
  rows,
  status,
  soonest,
  query,
  onQuery,
}: {
  rows: JobRow[];
  status: string;
  soonest: boolean;
  query: string;
  onQuery: (value: string) => void;
}) {
  const chipHref = (value: string): string => {
    const params = new URLSearchParams();
    if (value !== "") params.set("status", value);
    if (soonest) params.set("sort", "soonest");
    params.set("tab", "jobs");
    return `${JOBS_PATH}?${params.toString()}`;
  };
  const sortHref = (value: string): string => {
    const params = new URLSearchParams();
    if (status !== "") params.set("status", status);
    if (value !== "") params.set("sort", value);
    params.set("tab", "jobs");
    return `${JOBS_PATH}?${params.toString()}`;
  };
  const chipLabel = JOB_STATUS_WORDS[status] ?? "All";
  const searched = query.trim() === "" ? rows : rows.filter((j) => matches(j, query.trim()));
  // "Soonest first" is by scheduled start, with the not-yet-scheduled last —
  // an empty start is "no date yet", not "the earliest possible". Ties keep
  // their order.
  const ordered = soonest
    ? [...searched].sort((a, b) => {
        const ka = a.scheduledStart ?? "￿";
        const kb = b.scheduledStart ?? "￿";
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      })
    : searched;
  const meta =
    ordered.length === rows.length
      ? `${ordered.length} Jobs`
      : `Showing ${ordered.length} of ${rows.length} Jobs`;
  // The status chips read as titles ("Waiting for Approval"), so the empty
  // line names each status in its own natural words — splicing the title into
  // "No … jobs." read broken ("No Waiting for Approval jobs.").
  const empty =
    query.trim() !== ""
      ? "No jobs match your search."
      : status === ""
        ? "No jobs assigned yet."
        : (EMPTY_STATUS_LINES[status] ?? `No ${chipLabel} jobs.`);

  return (
    <SectionCard title="My Jobs" meta={meta}>
      <nav className={styles.chips} aria-label="Filter jobs by status">
        {[
          "",
          "scheduled",
          "in_progress",
          "pending_approval",
          "completed",
          "cancelled",
          "rejected",
        ].map((value) => (
          <Link
            key={value}
            to={chipHref(value)}
            className={status === value ? styles.chipActive : styles.chip}
            aria-current={status === value ? "true" : undefined}
          >
            {JOB_STATUS_WORDS[value] ?? "All"}
          </Link>
        ))}
      </nav>
      <div className={styles.tableTools}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search by job, customer, employee, work type or location…"
          aria-label="Search jobs"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        <nav className={styles.chips} aria-label="Sort jobs">
          <Link
            to={sortHref("")}
            className={!soonest ? styles.chipActive : styles.chip}
            aria-current={!soonest ? "true" : undefined}
          >
            Latest First
          </Link>
          <Link
            to={sortHref("soonest")}
            className={soonest ? styles.chipActive : styles.chip}
            aria-current={soonest ? "true" : undefined}
          >
            Earliest First
          </Link>
        </nav>
      </div>
      <DataTable
        columns={[
          "Job Details",
          "Customer",
          "Status",
          "Current Step",
          "Work Type",
          "Employee",
          "Priority",
          "Scheduled Date",
        ]}
        empty={empty}
        rows={ordered.map((j): TableCell[] => [
          jobCell(j),
          { text: j.customer?.name ?? "—" },
          { text: j.status, status: true },
          { text: stepCell(j) },
          { text: j.skill?.name ?? "—" },
          { text: j.technician?.name ?? "—" },
          j.priority === "urgent"
            ? { text: "Urgent", node: <span className={styles.urgent}>Urgent</span> }
            : { text: "—" },
          { text: fmtWhen(j.scheduledStart), quiet: true },
        ])}
      />
    </SectionCard>
  );
}

/** The one jobs page for both roles, one tab per panel: the owner gets the
 *  console treatment (tiles, create banner, DB-paged table) on Jobs and the
 *  queue, feed and report card on Approval, Activity and Report; a member
 *  sees their own jobs and their report and rejected history on theirs. Only
 *  the active tab's data is loaded. The page's action is the queue's: decide
 *  (approve/reject) and save an edit — members post nothing to this page. */
export function AdminJobsPage() {
  const data = useLoaderData<typeof adminJobsLoader>();
  const revalidator = useRevalidator();
  const location = useLocation();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle" || revalidator.state !== "idle";
  // A different address is loading (a filter or page changed) — the owner's
  // rows are about to be replaced, so the skeleton stands in. A plain
  // revalidation (the queue's action) keeps the current rows on screen.
  const navigating =
    navigation.state === "loading" &&
    (navigation.location?.pathname !== location.pathname ||
      navigation.location?.search !== location.search);
  const [query, setQuery] = useState("");

  // The member table's sort toggle rides the URL (?sort=soonest).
  const soonest = new URLSearchParams(location.search).get("sort") === "soonest";

  // The header's greeting pieces, per role: the owner wears the pill and the
  // actions; a member gets the same block without them. Every loader variant
  // carries `role` — including a failed load, where the loader preserves the
  // best-known role so the tab strip stays the member's.
  const isOwner = data.role === "owner";

  const baseTabs = isOwner ? OWNER_TABS : MEMBER_TABS;
  // The owner's pipeline is fetched on every owner tab, so the Approval tab
  // can carry its waiting count without being opened. The Jobs tab carries
  // the whole-company total when the jobs tab's data is in hand.
  const approvalBadge =
    data.state === "ok" && data.role === "owner" && data.pipeline.ok
      ? String(data.pipeline.data.pending)
      : undefined;
  const jobsBadge =
    data.state === "ok" && data.role === "owner" && data.tab === "jobs"
      ? String(data.result.stats.total)
      : undefined;
  const tabs = baseTabs.map((tab) => {
    if (tab.value === "approval" && approvalBadge !== undefined) {
      return { ...tab, badge: approvalBadge };
    }
    if (tab.value === "jobs" && jobsBadge !== undefined) {
      return { ...tab, badge: jobsBadge };
    }
    return tab;
  });

  if (data.state === "failed") {
    return (
      <>
        <TopBar />
        <div className={styles.stack}>
          <Tabs basePath={JOBS_PATH} tabs={baseTabs} current={data.tab} />
          <SectionCard title="Jobs">
            <p className={styles.failed} role="alert">
              We could not load the job list.
              <button
                type="button"
                className={styles.retry}
                onClick={() => revalidator.revalidate()}
                disabled={busy}
              >
                {busy ? "Trying Again…" : "Try Again"}
              </button>
            </p>
          </SectionCard>
        </div>
      </>
    );
  }

  if (data.role === "member") {
    return (
      <>
        <TopBar />
        <header className={styles.pageHead}>
          <div>
            <h1 className={styles.heading}>
              {data.selfName === null ? "Hello" : `Hello, ${data.selfName}`}
            </h1>
            <p className={styles.lede}>
              See the jobs assigned to you, upcoming work and jobs you have completed.
            </p>
          </div>
        </header>
        <Tabs basePath={JOBS_PATH} tabs={tabs} current={data.tab} />
        <div className={styles.stack}>
          {data.tab === "jobs" ? (
            <>
              <MemberJobsCards
                canCreateJobs={data.canCreateJobs}
                jobApprovalRequired={data.jobApprovalRequired}
                pending={data.pending}
                pendingMore={data.pendingMore}
              />
              <MemberJobsSection
                rows={data.rows}
                status={data.status}
                soonest={soonest}
                query={query}
                onQuery={setQuery}
              />
            </>
          ) : null}
          {data.tab === "report" ? (
            <MeReportCard
              report={data.report}
              reportPreset={data.reportPreset}
              basePath={JOBS_PATH}
            />
          ) : null}
          {data.tab === "rejected" ? (
            <MeRejectedCard
              rejected={data.rejected}
              rejectedMore={data.rejectedMore}
              rejectedNext={data.rejectedNext}
              reportPreset={data.reportPreset}
              basePath={JOBS_PATH}
            />
          ) : null}
          {data.tab === "activity" ? (
            <LatestJobActivity
              data={data.activity}
              basePath={JOBS_PATH}
              onRetry={() => revalidator.revalidate()}
            />
          ) : null}
        </div>
      </>
    );
  }

  // ── Owner ──────────────────────────────────────────────────────────────
  if (data.tab !== "jobs") {
    return (
      <>
        <TopBar />
        <OwnerHeader selfName={data.selfName} />
        <Tabs basePath={JOBS_PATH} tabs={tabs} current={data.tab} />
        <div className={styles.stack}>
          {data.tab === "approval" ? (
            <ApprovalQueueSection data={data.queue} basePath={JOBS_PATH} />
          ) : null}
          {data.tab === "activity" ? (
            <LatestJobActivity
              data={data.activity}
              basePath={JOBS_PATH}
              onRetry={() => revalidator.revalidate()}
            />
          ) : null}
          {data.tab === "report" ? (
            <SectionCard title="Job Activity Report">
              <ReportExportCard
                reportType="technician_job_activity"
                history={data.history}
                employees={data.employees}
                onRetryHistory={() => revalidator.revalidate()}
              />
            </SectionCard>
          ) : null}
        </div>
      </>
    );
  }

  const { result, filters, skills } = data;
  const from = (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.page * result.pageSize, result.total);

  const tiles: ConsoleTile[] = [
    {
      label: "Total Jobs",
      value: result.stats.total,
      icon: ClipboardListIcon,
      tone: "primary",
      sub: "All jobs created by your company.",
    },
    {
      label: "In Progress",
      value: result.stats.inProgress,
      icon: BellIcon,
      tone: "scheduled",
      sub: "Jobs that have started but are not yet completed.",
    },
    {
      label: "Waiting for Approval",
      value: result.stats.pendingApproval,
      icon: ApprovalTagIcon,
      tone: "violet",
      sub: "Jobs created by employees that need your approval.",
    },
    {
      label: "Completed (Last 30 Days)",
      value: result.stats.completed30d,
      icon: ZapIcon,
      tone: "done",
      sub: "Jobs completed in the last 30 days.",
    },
  ];

  return (
    <>
      <TopBar />
      <OwnerHeader selfName={data.selfName} />
      <Tabs basePath={JOBS_PATH} tabs={tabs} current={data.tab} />
      <ConsoleTiles tiles={tiles} />
      <JobsCreateBanner />
      <div className={styles.card}>
        <div className={styles.filterBar}>
          <StatusChips filters={filters} stats={result.stats} />
          <div className={styles.filterControls}>
            <ClearAllButton filters={filters} />
            <SearchBox filters={filters} />
            <SkillDropdown filters={filters} skills={skills.ok ? skills.data : []} />
            <PriorityDropdown filters={filters} />
            <SortDropdown filters={filters} />
          </div>
        </div>
        {result.data.length === 0 ? (
          <>
            <p className={styles.empty}>
              {result.total === 0
                ? "No jobs created yet. Create your first job and assign it to an employee."
                : "No jobs found. Try changing your filters or search."}
            </p>
            {result.total > 0 ? (
              <footer className={styles.tableFooter}>
                <RowsPerPage filters={filters} />
                <Pager filters={filters} page={result.page} pages={result.pages} />
              </footer>
            ) : null}
          </>
        ) : navigating ? (
          <TableSkeleton rows={6} />
        ) : (
          <>
            <div className={styles.tableWrap}>
              <JobsTable rows={result.data} />
            </div>
            <footer className={styles.tableFooter}>
              <p className={styles.showing}>
                Showing {from} to {to} of {result.total} {result.total === 1 ? "job" : "jobs"}
                {busy ? " — Updating…" : ""}
              </p>
              <RowsPerPage filters={filters} />
              <Pager filters={filters} page={result.page} pages={result.pages} />
            </footer>
          </>
        )}
      </div>
    </>
  );
}

/** The owner's greeting block: name, the Owner pill, and the page's two
 *  actions — create and export. */
function OwnerHeader({ selfName }: { selfName: string | null }) {
  return (
    <header className={styles.pageHead}>
      <div>
        <h1 className={styles.heading}>
          {selfName === null ? "Hello" : `Hello, ${selfName}`}
          <span className={styles.rolePill}>
            <CrownIcon size={13} className={styles.rolePillIcon} />
            Owner
          </span>
        </h1>
        <p className={styles.lede}>
          Create jobs, assign them to employees and track every job until it is completed.
        </p>
      </div>
      <div className={styles.pageActions}>
        <Link to="/admin/company/jobs/new" className={styles.primaryButton}>
          Create New Job
        </Link>
        <ExportJobsButton />
      </div>
    </header>
  );
}

/** The page's top bar: the breadcrumb. The search lives in the filter strip;
 *  the create and export actions live in the greeting block. */
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
          Jobs
        </span>
      </nav>
    </div>
  );
}
