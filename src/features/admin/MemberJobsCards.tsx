import { Link } from "react-router";
import { SectionCard } from "./components/SectionCard";
import { waitLabel } from "./format";
import type { Slice } from "./slice";
import type { ApprovalQueueItem } from "./approvalApi";
import styles from "./MemberJobsCards.module.css";

/** The job panels a member sees on the jobs page's first tab, above the
 *  table (moved off the Me page): the New job action follows the caller's
 *  own create switch, and the pending card degrades when its slice fails.
 *  My job activity and my rejected jobs live on their own tabs. */

export function MemberJobsCards({
  canCreateJobs,
  jobApprovalRequired,
  pending,
  pendingMore,
}: {
  /** My own job switches (CAP-1) — display truth for the New job card. */
  canCreateJobs: boolean;
  jobApprovalRequired: boolean;
  pending: Slice<ApprovalQueueItem[]>;
  pendingMore: boolean;
}) {
  return (
    <>
      {canCreateJobs ? (
        <SectionCard title="New job">
          <p className={styles.newJobLine}>
            {jobApprovalRequired
              ? "Create a job for a customer. Your company owner must approve it before it is assigned."
              : "Create a job for a customer. It will be assigned to you immediately."}
          </p>
          <Link to="/admin/me/new-job" className={styles.newJobLink}>
            Create Job
          </Link>
        </SectionCard>
      ) : null}

      {pending.ok && pending.data.length > 0 ? (
        <SectionCard
          title="Waiting for Approval"
          meta={
            pendingMore
              ? `${pending.data.length}+ Jobs Waiting`
              : `${pending.data.length} ${pending.data.length === 1 ? "Job" : "Jobs"} Waiting`
          }
        >
          <ul className={styles.pendingList}>
            {pending.data.map((p) => (
              <li key={p.id} className={styles.pendingItem}>
                <span className={styles.pendingJob}>{p.description ?? p.jobNumber}</span>
                <span className={styles.pendingMeta}>
                  · {p.jobNumber}
                  {p.customerName !== null ? ` · ${p.customerName}` : " · No Customer"} · Waiting
                  for {waitLabel(p.ageHours)}
                </span>
              </li>
            ))}
          </ul>
          {pendingMore ? (
            <p className={styles.pendingMeta}>Older jobs are available on the next pages.</p>
          ) : null}
          <p className={styles.pendingMeta}>
            Your company owner will approve or reject these jobs. You will receive a notification on
            your phone. You can also check the result under{" "}
            <Link to="/admin/company/jobs?tab=report">My Report</Link>.
          </p>
        </SectionCard>
      ) : null}
      {!pending.ok ? (
        <SectionCard title="Waiting for Approval">
          <p className={styles.failed} role="alert">
            We could not load the jobs waiting for approval. Please try again from the sidebar.
          </p>
        </SectionCard>
      ) : null}
    </>
  );
}
