import { Link } from "react-router";
import type { OwnerPipeline } from "./jobReportsApi";
import type { Slice } from "./slice";
import { SectionCard } from "./components/SectionCard";
import styles from "./OwnerPipelineStrip.module.css";

/** Whole minutes as a person reads them: under an hour in minutes, above in
 *  hours and minutes ("42 min", "1 h 12 min"). The minutes floor, never
 *  round — rounding could read "1 h 60 min". */
function decisionLabel(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.floor(minutes % 60);
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** The owner's approval pipeline at a glance — one row above the queue: how
 *  many submissions are waiting, how many have waited over a day, how fast
 *  decisions land and what share were approved. The job that has waited
 *  longest links straight to its detail. Data comes from the same 30-day
 *  owner report the reports dashboard uses. */
export function OwnerPipelineStrip({
  data,
  basePath,
  onRetry,
}: {
  data: Slice<OwnerPipeline>;
  basePath: string;
  onRetry: () => void;
}) {
  if (!data.ok) {
    return (
      <SectionCard title="Job approvals" meta="Last 30 days">
        <p className={styles.failed} role="alert">
          The approval summary could not load.
          <button type="button" className={styles.retry} onClick={onRetry}>
            Try again
          </button>
        </p>
      </SectionCard>
    );
  }
  const p = data.data;
  if (p.pending === 0) {
    return (
      <SectionCard title="Job approvals" meta="Last 30 days">
        <p className={styles.line}>Nothing waiting — every submission has a decision.</p>
        {p.approvalRate !== null || p.averageMinutesToDecision !== null ? (
          <p className={styles.line}>
            {p.averageMinutesToDecision !== null
              ? `Average ${decisionLabel(p.averageMinutesToDecision)} to decide`
              : null}
            {p.averageMinutesToDecision !== null && p.approvalRate !== null ? " · " : null}
            {p.approvalRate !== null ? `${Math.round(p.approvalRate * 100)}% approved` : null}
          </p>
        ) : null}
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Job approvals" meta="Last 30 days">
      <div className={styles.row}>
        <div className={styles.stat}>
          <span className={styles.big}>{p.pending}</span>
          <span className={styles.label}>waiting</span>
          {p.pendingOverOneDay > 0 ? (
            <span className={styles.overdue}>{p.pendingOverOneDay} over a day</span>
          ) : null}
        </div>
        <div className={styles.stat}>
          <span className={styles.big}>
            {p.averageMinutesToDecision === null ? "—" : decisionLabel(p.averageMinutesToDecision)}
          </span>
          <span className={styles.label}>average time to decide</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.big}>
            {p.approvalRate === null ? "—" : `${Math.round(p.approvalRate * 100)}%`}
          </span>
          <span className={styles.label}>approved</span>
        </div>
      </div>
      {p.oldestPending !== null ? (
        <p className={styles.line}>
          <Link to={`${basePath}/${p.oldestPending.id}`} className={styles.oldest}>
            {p.oldestPending.jobNumber} has waited longest — review it
          </Link>
        </p>
      ) : null}
    </SectionCard>
  );
}
