import { Link } from "react-router";
import type { JobRow } from "../companyApi";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./Badge";
import { fmtWhen } from "../format";
import { humanize } from "../status";
import styles from "./JobsTable.module.css";

export const JOBS_TABLE_PATH = "/admin/company/jobs";

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

/** The Job cell: the work leads, and the line under it answers "which job" —
 *  its number, or the place when there is no description. A rejected job
 *  shows the owner's reason instead (or that none was given). */
function JobCell({ job }: { job: JobRow }) {
  // The backend accepts an empty description, so "" counts as "no
  // description" — otherwise the title line renders blank.
  const description = job.description !== null && job.description !== "" ? job.description : null;
  // A rejected job shows the owner's reason instead of the place — but keeps
  // its number visible when the description leads the cell, or the row would
  // carry no number anywhere.
  const sub =
    job.status === "rejected"
      ? description !== null
        ? `${job.rejectionReason ?? "No reason given."} – Job Number: ${job.jobNumber}`
        : (job.rejectionReason ?? "No reason given.")
      : description !== null
        ? job.jobNumber
        : job.serviceLocation;
  return (
    <Link to={`${JOBS_TABLE_PATH}/${job.id}`} className={styles.jobLink}>
      <span className={styles.jobTitle}>{description ?? job.jobNumber}</span>
      <span className={styles.jobSub}>{sub}</span>
    </Link>
  );
}

/** The Customer cell: the person the work is for — the avatar, their name,
 *  and the job's place under it (the same visit's address, not the
 *  customer's whole profile). */
function CustomerCell({ job }: { job: JobRow }) {
  const name = job.customer?.name ?? null;
  return (
    <div className={styles.customerCell}>
      <Avatar name={name} />
      <div className={styles.customerText}>
        <span className={styles.customerName}>{name ?? "—"}</span>
        <span className={styles.customerPlace}>{job.serviceLocation}</span>
      </div>
    </div>
  );
}

/**
 * The jobs table: the work (title + number), the customer it serves, its
 * status, its step on the template, its skill, its employee, the dispatch
 * priority and the scheduled time. The page owns paging and filters.
 */
export function JobsTable({ rows }: { rows: JobRow[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Job Details</th>
          <th scope="col">Customer</th>
          <th scope="col">Status</th>
          <th scope="col">Current Step</th>
          <th scope="col">Work Type</th>
          <th scope="col">Employee</th>
          <th scope="col">Priority</th>
          <th scope="col">Scheduled Date</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((j) => (
          <tr key={j.id}>
            <td>
              <JobCell job={j} />
            </td>
            <td>
              <CustomerCell job={j} />
            </td>
            <td>
              <StatusBadge status={j.status} />
            </td>
            <td className={styles.quiet}>{stepCell(j)}</td>
            <td className={styles.quiet}>{j.skill?.name ?? "—"}</td>
            <td>{j.technician?.name ?? <span className={styles.quiet}>—</span>}</td>
            <td>
              {j.priority === "urgent" ? (
                <span className={styles.urgentPill}>Urgent</span>
              ) : (
                <span className={styles.quiet}>—</span>
              )}
            </td>
            <td className={styles.quiet}>{fmtWhen(j.scheduledStart)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
