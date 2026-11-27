import { Link } from "react-router";
import type { JobRow } from "../companyApi";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./Badge";
import { fmtWhen } from "../format";
import styles from "./JobsTable.module.css";

export const JOBS_TABLE_PATH = "/admin/company/jobs";

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
 * status, its skill, its employee, the dispatch priority and the scheduled
 * time. The page owns paging and filters. (The Current Step column left
 * with the owner's 2026-11-27 trim — the job detail page holds the step.)
 */
export function JobsTable({ rows }: { rows: JobRow[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Job Details</th>
          <th scope="col">Customer</th>
          <th scope="col">Status</th>
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
            <td className={styles.quiet}>{j.skill?.name ?? "—"}</td>
            <td>
              {j.technician === null || !j.technician.name?.trim() ? (
                <span className={styles.quiet}>—</span>
              ) : (
                // The employee cell opens the profile page (owner request,
                // 2026-11-27): the id is the profile route's :userId.
                <Link
                  to={`/admin/company/employees/${j.technician.id}`}
                  className={styles.employeeLink}
                  title="Open the employee's profile"
                >
                  {j.technician.name}
                </Link>
              )}
            </td>
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
