import { Badge } from "../components/Badge";
import type { CommitResponse } from "./importApi";
import styles from "./ImportResults.module.css";

const OUTCOME: Record<
  CommitResponse["rows"][number]["status"],
  { label: string; tone: "done" | "progress" | "cancelled" }
> = {
  created: { label: "Created", tone: "done" },
  updated: { label: "Updated", tone: "progress" },
  failed: { label: "Not saved", tone: "cancelled" },
};

type ImportResultsProps = {
  result: CommitResponse;
};

/** The outcome of one submit: the totals first, then each row with its reasons. */
export function ImportResults({ result }: ImportResultsProps) {
  const { summary } = result;
  return (
    <section className={styles.panel} aria-labelledby="import-result-title">
      <h3 id="import-result-title" className={styles.title}>
        Import finished
      </h3>
      <p className={styles.summary} role="status">
        {summary.created} created, {summary.updated} updated, {summary.failed} not saved.
      </p>
      <ul className={styles.list}>
        {result.rows.map((row) => {
          const outcome = OUTCOME[row.status];
          return (
            <li key={row.rowIndex} className={styles.item}>
              <span className={styles.rowNumber}>Row {row.rowIndex + 1}</span>
              <Badge label={outcome.label} tone={outcome.tone} />
              {row.reasons.length > 0 ? (
                <ul className={styles.reasons}>
                  {row.reasons.map((reason, index) => (
                    <li key={`${reason.code}-${index}`}>{reason.message}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
