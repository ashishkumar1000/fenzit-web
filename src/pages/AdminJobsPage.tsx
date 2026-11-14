import { useState } from "react";
import { Link, useLoaderData, useRevalidator, useSearchParams } from "react-router";
import type { adminJobsLoader } from "../features/admin/adminBrowseLoaders";
import { humanize } from "../features/admin/status";
import { SectionCard } from "../features/admin/components/SectionCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { Tabs } from "../features/admin/components/Tabs";
import { fmtWhen } from "../features/admin/format";
import { MemberJobsCards } from "../features/admin/MemberJobsCards";
import { ApprovalQueueSection } from "../features/admin/ApprovalQueueSection";
import { OwnerPipelineStrip } from "../features/admin/OwnerPipelineStrip";
import { LatestJobActivity } from "../features/admin/LatestJobActivity";
import { MeReportCard, MeRejectedCard } from "../features/admin/MeJobActivity";
import { ReportExportCard } from "../features/admin/ReportExportCard";
import type { JobRow } from "../features/admin/companyApi";
import styles from "./AdminJobsPage.module.css";

const JOBS_PATH = "/admin/company/jobs";

/** Each page's panels, one tab each — the tab change is navigation
 *  (`?tab=`), and the loader fetches only the active tab's data. */
const OWNER_TABS = [
  { value: "jobs", label: "Jobs" },
  { value: "approval", label: "Approval" },
  { value: "activity", label: "Activity" },
  { value: "report", label: "Report" },
];
const MEMBER_TABS = [
  { value: "jobs", label: "Jobs" },
  { value: "report", label: "My report" },
  { value: "rejected", label: "Rejected" },
  { value: "activity", label: "Activity" },
];

/** The chips, in the order a job's life runs. The empty value is All. */
const STATUS_CHIPS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
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

/** The Job cell: the work leads, and the line under it answers "which job"
 *  — its number, or the location when there is no description. A rejected
 *  job shows the owner's reason instead (or that none was given). */
function jobCell(job: JobRow): TableCell {
  // A rejected job shows the owner's reason instead of the location — but
  // keeps its number visible when the description leads the cell, or the row
  // would carry no number anywhere.
  const sub =
    job.status === "rejected"
      ? job.description !== null
        ? `${job.rejectionReason ?? "No reason given"} · ${job.jobNumber}`
        : (job.rejectionReason ?? "No reason given")
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

/** Client-side text search over the loaded rows — the job's own words, its
 *  people, its skill, its place. Case-blind; an empty query keeps all. */
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

/** The shared jobs table, the first tab for both roles: chips riding
 *  `?status=`, a client-side search box, and the `?sort=` toggle. */
function JobsSection({
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
  const chipLabel = STATUS_CHIPS.find((chip) => chip.value === status)?.label ?? "All";
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
      ? `${ordered.length} jobs`
      : `${ordered.length} of ${rows.length} jobs`;
  const empty =
    query.trim() !== ""
      ? "No job matches that search."
      : status === ""
        ? "No jobs yet."
        : `No ${chipLabel.toLowerCase()} jobs.`;

  return (
    <SectionCard title="Jobs" meta={meta}>
      <nav className={styles.chips} aria-label="Filter jobs by status">
        {STATUS_CHIPS.map((chip) => (
          <Link
            key={chip.value}
            to={chipHref(chip.value)}
            className={status === chip.value ? styles.chipActive : styles.chip}
            aria-current={status === chip.value ? "true" : undefined}
          >
            {chip.label}
          </Link>
        ))}
      </nav>
      <div className={styles.tableTools}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search job, customer, employee, skill, place…"
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
            Latest first
          </Link>
          <Link
            to={sortHref("soonest")}
            className={soonest ? styles.chipActive : styles.chip}
            aria-current={soonest ? "true" : undefined}
          >
            Soonest first
          </Link>
        </nav>
      </div>
      <DataTable
        columns={[
          "Job",
          "Customer",
          "Status",
          "Step",
          "Skill",
          "Employee",
          "Priority",
          "Scheduled",
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

/** The one jobs page for both roles, one tab per panel: a member's panels
 *  and the shared table on Jobs; the owner's queue, feed and report card on
 *  Approval, Activity and Report. Only the active tab's data is loaded. */
export function AdminJobsPage() {
  const data = useLoaderData<typeof adminJobsLoader>();
  const revalidator = useRevalidator();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const soonest = searchParams.get("sort") === "soonest";
  const busy = revalidator.state !== "idle";
  const baseTabs = data.role === "owner" ? OWNER_TABS : MEMBER_TABS;
  // The owner's pipeline is fetched on every owner tab, so the Approval tab
  // can carry its waiting count without being opened.
  const approvalBadge =
    data.state === "ok" && data.role === "owner" && data.pipeline.ok
      ? String(data.pipeline.data.pending)
      : undefined;
  const tabs = baseTabs.map((tab) =>
    tab.value === "approval" && approvalBadge !== undefined
      ? { ...tab, badge: approvalBadge }
      : tab,
  );

  if (data.state === "failed") {
    return (
      <div className={styles.stack}>
        <Tabs basePath={JOBS_PATH} tabs={baseTabs} current={data.tab} />
        <SectionCard title="Jobs">
          <p className={styles.failed} role="alert">
            The job list could not load.
            <button
              type="button"
              className={styles.retry}
              onClick={() => revalidator.revalidate()}
              disabled={busy}
            >
              {busy ? "Retrying…" : "Try again"}
            </button>
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <Tabs basePath={JOBS_PATH} tabs={tabs} current={data.tab} />
      {data.tab === "jobs" ? (
        <>
          {data.role === "owner" ? (
            <>
              <SectionCard title="New job">
                <p className={styles.newJobLine}>
                  Create a job for a customer and assign it to any employee.
                </p>
                <Link to="/admin/company/jobs/new" className={styles.primaryButton}>
                  Create a job
                </Link>
              </SectionCard>
              <OwnerPipelineStrip
                data={data.pipeline}
                basePath={JOBS_PATH}
                onRetry={() => revalidator.revalidate()}
              />
            </>
          ) : (
            <MemberJobsCards
              canCreateJobs={data.canCreateJobs}
              jobApprovalRequired={data.jobApprovalRequired}
              pending={data.pending}
              pendingMore={data.pendingMore}
            />
          )}
          <JobsSection
            rows={data.rows}
            status={data.status}
            soonest={soonest}
            query={query}
            onQuery={setQuery}
          />
        </>
      ) : null}
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
        data.role === "owner" ? (
          <SectionCard title="Job activity report">
            <ReportExportCard
              reportType="technician_job_activity"
              history={data.history}
              employees={data.employees}
              onRetryHistory={() => revalidator.revalidate()}
            />
          </SectionCard>
        ) : (
          <MeReportCard
            report={data.report}
            reportPreset={data.reportPreset}
            basePath={JOBS_PATH}
          />
        )
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
    </div>
  );
}
