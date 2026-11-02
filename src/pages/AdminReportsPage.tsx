import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { adminReportsAction, adminReportsLoader } from "../features/admin/adminReportsLoaders";
import type { ReportReason, ReportRow } from "../features/admin/reportsApi";
import { SectionCard } from "../features/admin/components/SectionCard";
import { fmtWhen } from "../features/admin/format";
import styles from "./AdminReportsPage.module.css";

const REASON_LABELS: Record<ReportReason, string> = {
  inappropriate: "Inappropriate content",
  harassment: "Harassment or abuse",
  spam: "Spam or unrelated photo",
  other: "Something else",
};

/** Staff review queue: open photo reports, oldest first. Hide or dismiss each one. */
export function AdminReportsPage() {
  const data = useLoaderData<typeof adminReportsLoader>();
  const result = useActionData<typeof adminReportsAction>();
  const navigation = useNavigation();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (data.state === "failed") {
    return (
      <SectionCard title="Photo reports">
        <p className={styles.alert} role="alert">
          The report list could not load. Refresh the page to try again.
        </p>
      </SectionCard>
    );
  }

  const actionError =
    result?.state === "error" && !data.rows.some((r) => r.id === result.reportId)
      ? result.message
      : null;

  const pendingId =
    navigation.state === "submitting" ? String(navigation.formData?.get("reportId") ?? "") : "";

  return (
    <SectionCard title="Photo reports" meta={String(data.rows.length)}>
      {navigation.state === "loading" ? <p className={styles.quiet}>Loading reports…</p> : null}
      {actionError ? (
        <p className={styles.alert} role="alert">
          {actionError}
        </p>
      ) : null}
      {data.rows.length === 0 ? (
        <p className={styles.quiet}>No reports are waiting. New reports appear here.</p>
      ) : (
        <ul className={styles.list}>
          {data.rows.map((row) => (
            <ReportItem
              key={row.id}
              row={row}
              confirming={confirmingId === row.id}
              busy={pendingId === row.id}
              error={
                result?.state === "error" && result.reportId === row.id ? result.message : null
              }
              onAskHide={() => setConfirmingId(row.id)}
              onCancelHide={() => setConfirmingId(null)}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

type ReportItemProps = {
  row: ReportRow;
  confirming: boolean;
  busy: boolean;
  error: string | null;
  onAskHide: () => void;
  onCancelHide: () => void;
};

function ReportItem({ row, confirming, busy, error, onAskHide, onCancelHide }: ReportItemProps) {
  const [photoBroken, setPhotoBroken] = useState(false);
  const note = row.note?.trim() ?? "";
  const reasonLabel = REASON_LABELS[row.reason as ReportReason] ?? "Unknown reason";
  const photoMissing = row.photoUrl === null || photoBroken;
  const hideBlocked = row.photoHidden || photoMissing;

  return (
    <li className={styles.item}>
      {photoMissing ? (
        <div className={styles.thumbEmpty}>Photo unavailable</div>
      ) : (
        <img
          className={styles.thumb}
          src={row.photoUrl ?? undefined}
          alt="Reported job photo"
          loading="lazy"
          onError={() => setPhotoBroken(true)}
        />
      )}
      <div className={styles.details}>
        <p className={styles.reason}>{reasonLabel}</p>
        {note ? <p className={styles.note}>“{note}”</p> : null}
        <p className={styles.quiet}>
          Job {row.jobId.slice(0, 8)} · reported {fmtWhen(row.createdAt)}
        </p>
        {row.photoHidden ? <p className={styles.quiet}>This photo is already hidden.</p> : null}
        {!row.photoHidden && photoMissing ? (
          <p className={styles.quiet}>
            The photo cannot be shown, so it cannot be hidden from here.
          </p>
        ) : null}
        {error ? (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          {confirming ? (
            <>
              <p className={styles.quiet}>
                Hiding removes the photo from the job and the app. This page cannot undo it.
              </p>
              <Form method="post" className={styles.inline}>
                <input type="hidden" name="reportId" value={row.id} />
                <button
                  type="submit"
                  name="action"
                  value="hide"
                  className={styles.danger}
                  disabled={busy}
                >
                  {busy ? "Hiding…" : "Yes, hide photo"}
                </button>
              </Form>
              <button type="button" className={styles.quietButton} onClick={onCancelHide}>
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.danger}
              onClick={onAskHide}
              disabled={busy || hideBlocked}
            >
              Hide photo
            </button>
          )}
          <Form method="post" className={styles.inline}>
            <input type="hidden" name="reportId" value={row.id} />
            <button
              type="submit"
              name="action"
              value="dismiss"
              className={styles.button}
              disabled={busy}
            >
              {busy ? "Working…" : "Dismiss report"}
            </button>
          </Form>
        </div>
      </div>
    </li>
  );
}
