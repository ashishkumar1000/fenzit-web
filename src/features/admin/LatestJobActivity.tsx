import { Link } from "react-router";
import { payloadText, type NotificationRow } from "./notificationsApi";
import { humanize } from "./status";
import type { Slice } from "./slice";
import { SectionCard } from "./components/SectionCard";
import { fmtWhen } from "./format";
import styles from "./LatestJobActivity.module.css";

/** The alert in one line, as the person involved reads it. A known event
 *  speaks plainly; a new backend event still shows, its type humanised
 *  rather than left as wire noise. */
function line(row: NotificationRow): string {
  const job = payloadText(row, "job_number") ?? "A job";
  const customer = payloadText(row, "customer_name");
  const forWhom = customer !== null ? ` for ${customer}` : "";
  switch (row.eventType) {
    case "job.submitted":
      return `${payloadText(row, "employee_name") ?? "An employee"} submitted ${job}${forWhom}`;
    case "job.approved":
      return `${job}${forWhom} was approved`;
    case "job.rejected": {
      const reason = payloadText(row, "reason");
      return `${job}${forWhom} was rejected${reason !== null ? ` — ${reason}` : ""}`;
    }
    case "job.edited": {
      const fields = row.payload["changed_fields"];
      const names = Array.isArray(fields)
        ? (fields as unknown[]).filter((f): f is string => typeof f === "string").join(", ")
        : "";
      return `${job}${forWhom} was edited${names !== "" ? ` (${names})` : ""}`;
    }
    case "job.cancelled":
      return `${job}${forWhom} was cancelled`;
    case "job.assigned":
      return `${job}${forWhom} was assigned`;
    default:
      return `${job} — ${humanize(row.eventType.replace(/^job\./, ""))}`;
  }
}

/** The latest job alerts the signed-in person received — decisions,
 *  submissions, edits — newest first, each opening the job it names. Both
 *  roles get this: the server shows each person only what concerns them. */
export function LatestJobActivity({
  data,
  basePath,
  onRetry,
}: {
  data: Slice<NotificationRow[]>;
  basePath: string;
  onRetry: () => void;
}) {
  return (
    <SectionCard
      title="Latest job activity"
      meta={data.ok && data.data.length > 0 ? `${data.data.length}` : null}
    >
      {!data.ok ? (
        <p className={styles.failed} role="alert">
          The activity feed could not load.
          <button type="button" className={styles.retry} onClick={onRetry}>
            Try again
          </button>
        </p>
      ) : data.data.length === 0 ? (
        <p className={styles.line}>No job activity yet. Alerts appear here as they happen.</p>
      ) : (
        <ul className={styles.feed}>
          {data.data.map((row) => (
            <li key={row.id} className={row.readAt === null ? styles.event : styles.eventRead}>
              {row.jobId !== null ? (
                <Link to={`${basePath}/${row.jobId}`} className={styles.eventLink}>
                  {line(row)}
                </Link>
              ) : (
                <span className={styles.eventText}>{line(row)}</span>
              )}
              <span className={styles.when}>{fmtWhen(row.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
