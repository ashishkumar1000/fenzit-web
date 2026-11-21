import { Link } from "react-router";
import type { JobsPageResult } from "../../companyApi";
import type { Slice } from "../../slice";
import { DataTable, type TableCell } from "../Table";
import { SectionCard } from "../SectionCard";
import { fmtIstDay } from "../../format";
import styles from "./ProfileJobsPanel.module.css";

/**
 * The profile's Jobs tab: the employee's own job history from the paged jobs
 * endpoint scoped to them (its stats are scoped too, so the chips tell the
 * truth about this person). Job numbers link into the job detail pages — the
 * Jobs page keeps the dispatch surface, the profile only reads.
 */

export function ProfileJobsPanel({ jobs }: { jobs: Slice<JobsPageResult> }) {
  if (!jobs.ok) {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          The job history could not load. Try opening this page again from the menu.
        </p>
      </div>
    );
  }
  const data = jobs.data;
  const chips = [
    { label: "Total jobs", value: data.stats.total, tone: styles.chipPrimary },
    { label: "In progress", value: data.stats.inProgress, tone: styles.chip },
    { label: "Scheduled", value: data.stats.scheduled, tone: styles.chip },
    { label: "Completed", value: data.stats.completed, tone: styles.chipDone },
  ];
  const rows: TableCell[][] = data.data.map((job) => [
    {
      node: (
        <Link to={`/admin/company/jobs/${job.id}`} className={styles.jobLink}>
          {job.jobNumber}
        </Link>
      ),
      text: job.jobNumber,
    },
    { text: job.skill?.name ?? "—" },
    { text: job.serviceLocation },
    { text: job.scheduledStart === null ? "—" : fmtIstDay(job.scheduledStart), quiet: true },
    { text: job.status, status: true },
  ]);
  return (
    <div className={styles.card}>
      <div className={styles.chipRow}>
        {chips.map((chip) => (
          <span key={chip.label} className={chip.tone}>
            <strong>{chip.value}</strong> {chip.label}
          </span>
        ))}
      </div>
      <SectionCard title="Job history">
        <DataTable
          columns={["Job", "Service", "Location", "Date", "Status"]}
          rows={rows}
          empty="No jobs yet — assign one from the Assign Job button above."
        />
        {data.total > data.data.length ? (
          <p className={styles.more}>
            Showing the newest {data.data.length} of {data.total} —{" "}
            <Link to="/admin/company/jobs" className={styles.jobLink}>
              open the Jobs page
            </Link>{" "}
            for everything.
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
