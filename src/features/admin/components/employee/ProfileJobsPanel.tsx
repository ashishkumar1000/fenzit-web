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
          We could not load the employee's job history. Please go back to the menu and open this
          page again.
        </p>
      </div>
    );
  }
  const data = jobs.data;
  const chips = [
    { label: "Total Jobs", value: data.stats.total, tone: styles.chipPrimary },
    { label: "In Progress", value: data.stats.inProgress, tone: styles.chip },
    { label: "Scheduled", value: data.stats.scheduled, tone: styles.chip },
    { label: "Done", value: data.stats.completed, tone: styles.chipDone },
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
      <SectionCard title="Job History">
        <DataTable
          columns={["Job", "Work Type", "Location", "Date", "Status"]}
          rows={rows}
          empty="No jobs assigned yet. Use the Assign Job button above to assign the first job."
        />
        {data.total > data.data.length ? (
          <p className={styles.more}>
            {`Showing the latest ${data.data.length} jobs out of ${data.total}. `}
            <Link to="/admin/company/jobs" className={styles.jobLink}>
              Open the Jobs page
            </Link>{" "}
            to see all jobs.
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
