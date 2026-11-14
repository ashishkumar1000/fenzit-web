import { reportTypeLabel, type ReportHistoryRow, type ReportTypeChoice } from "./jobExportApi";
import { StatusBadge } from "./components/Badge";
import { fmtDay, fmtWhen } from "./format";
import type { Slice } from "./slice";
import styles from "./ReportHistoryList.module.css";

/** "16 Oct 2026 – 14 Nov 2026" — the report's window, as the owner reads it. */
function rangeLabel(row: ReportHistoryRow): string {
  return `${fmtDay(row.range.startDate)} – ${fmtDay(row.range.endDate)}`;
}

/** The chosen type's past generations, newest first: window, scope, outcome
 *  and its own actions — Download on a ready row, Try again on a failed one
 *  (the same row regenerates in place). Presentational: the parent owns the
 *  busy flags and the handlers. */
export function ReportHistoryList({
  history,
  reportType,
  busyId,
  busyKind,
  error,
  onDownload,
  onRetry,
  onRetryHistory,
}: {
  history: Slice<ReportHistoryRow[]>;
  reportType: ReportTypeChoice;
  busyId: string | null;
  busyKind: "download" | "retry" | null;
  /** The parent's per-row action error (download or retry). */
  error: string | null;
  onDownload: (row: ReportHistoryRow) => void;
  onRetry: (row: ReportHistoryRow) => void;
  onRetryHistory: () => void;
}) {
  const rows = history.ok ? history.data.filter((row) => row.reportType === reportType) : [];
  const label = reportTypeLabel(reportType).toLowerCase();

  return (
    <div>
      <div className={styles.head}>
        <h4 className={styles.title}>Previous {label} reports</h4>
        {history.ok && rows.length > 0 ? <span className={styles.count}>{rows.length}</span> : null}
      </div>
      {!history.ok ? (
        <p className={styles.hint} role="alert">
          The report history could not load.
          <button type="button" className={styles.retry} onClick={onRetryHistory}>
            Try again
          </button>
        </p>
      ) : rows.length === 0 ? (
        <p className={styles.hint}>
          Nothing generated yet. Reports you build are listed here to download again.
        </p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id} className={styles.row}>
              <div className={styles.main}>
                <span className={styles.range}>{rangeLabel(row)}</span>
                <span className={styles.meta}>
                  {row.technicianCount === null
                    ? "All employees"
                    : `${row.technicianCount} employee${row.technicianCount === 1 ? "" : "s"}`}
                  {" · "}
                  {fmtWhen(row.createdAt)}
                </span>
              </div>
              <div className={styles.side}>
                <StatusBadge status={row.status} />
                {row.status === "ready" ? (
                  <button
                    type="button"
                    className={styles.action}
                    onClick={() => onDownload(row)}
                    disabled={busyId !== null}
                    aria-label={`Download the ${rangeLabel(row)} ${label} report`}
                  >
                    {busyId === row.id ? "Preparing…" : "Download"}
                  </button>
                ) : row.status === "failed" ? (
                  <button
                    type="button"
                    className={styles.action}
                    onClick={() => onRetry(row)}
                    disabled={busyId !== null}
                    aria-label={`Retry the ${rangeLabel(row)} ${label} report`}
                  >
                    {busyId === row.id && busyKind === "retry" ? "Retrying…" : "Try again"}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {error !== null ? (
        <p className={styles.alert} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
