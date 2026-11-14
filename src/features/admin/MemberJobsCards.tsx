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
              ? "Create a job for a customer — it waits for your owner's approval first."
              : "Create a job for a customer — it is assigned to you at once."}
          </p>
          <Link to="/admin/me/new-job" className={styles.newJobLink}>
            Create a job
          </Link>
        </SectionCard>
      ) : null}

      {pending.ok && pending.data.length > 0 ? (
        <SectionCard
          title="Waiting for approval"
          meta={pendingMore ? `${pending.data.length}+ waiting` : `${pending.data.length} waiting`}
        >
          <ul className={styles.pendingList}>
            {pending.data.map((p) => (
              <li key={p.id} className={styles.pendingItem}>
                <span className={styles.pendingJob}>{p.description ?? p.jobNumber}</span>
                <span className={styles.pendingMeta}>
                  · {p.jobNumber}
                  {p.customerName !== null ? ` · ${p.customerName}` : " · (no customer)"} · waiting{" "}
                  {waitLabel(p.ageHours)}
                </span>
              </li>
            ))}
          </ul>
          {pendingMore ? (
            <p className={styles.pendingMeta}>Older submissions follow on the next pages.</p>
          ) : null}
          <p className={styles.pendingMeta}>
            Your owner decides these — you get a notification on your phone, and the outcome shows
            in <Link to="/admin/company/jobs?tab=report">My report</Link>.
          </p>
        </SectionCard>
      ) : null}
      {!pending.ok ? (
        <SectionCard title="Waiting for approval">
          <p className={styles.failed} role="alert">
            Your waiting-for-approval list could not load. Retry from the sidebar.
          </p>
        </SectionCard>
      ) : null}
    </>
  );
}
