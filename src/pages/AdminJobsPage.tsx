import { useLoaderData } from "react-router";
import type { adminJobsLoader } from "../features/admin/adminBrowseLoaders";
import { humanize } from "../features/admin/status";
import { SectionCard } from "../features/admin/components/SectionCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { fmtWhen } from "../features/admin/format";
import styles from "./AdminJobsPage.module.css";

/** The jobs drill-down: every job of the company across all timelines
 *  (today, upcoming, overdue, history), newest scheduled first. */
export function AdminJobsPage() {
  const data = useLoaderData<typeof adminJobsLoader>();

  if (data.state === "failed") {
    return (
      <SectionCard title="Jobs">
        <p className={styles.failed} role="alert">
          The job list could not load. Use the sidebar to retry this page.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Jobs" meta={String(data.rows.length)}>
      <DataTable
        columns={["Job", "Status", "Step", "Skill", "Priority", "Scheduled"]}
        empty="No jobs yet."
        rows={data.rows.map((j): TableCell[] => [
          { text: j.jobNumber },
          { text: j.status, status: true },
          { text: j.currentStep ?? "—" },
          { text: j.skill?.name ?? "—" },
          { text: j.priority === null ? "—" : humanize(j.priority) },
          { text: fmtWhen(j.scheduledStart), quiet: true },
        ])}
      />
      <p className={styles.note}>
        The first 25 jobs of every timeline are shown while the lists are small.
      </p>
    </SectionCard>
  );
}
