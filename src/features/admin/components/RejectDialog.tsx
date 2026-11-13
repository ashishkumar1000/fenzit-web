import { Form, useActionData, useNavigation } from "react-router";
import { useId, useRef } from "react";
import type { DecisionResult } from "../approvalLoaders";
import styles from "./RejectDialog.module.css";

/**
 * The reject control for one approval-queue row (Epic 22, CAP-5). A native
 * `<dialog>`: showModal() gives modal focus, Escape-to-close and the dimmed
 * backdrop; a click on the backdrop also closes it. The decision posts to the
 * queue page's action. When the decision fails (the job was decided first),
 * the dialog stays open with the error inside it — never hidden behind the
 * overlay.
 */
export function RejectDialog({ jobId }: { jobId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const action = useActionData<DecisionResult>();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting" && navigation.formData?.get("jobId") === jobId;
  const error = action?.state === "error" && action.jobId === jobId ? action.message : null;

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={styles.rejectButton}
        onClick={() => {
          if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
        }}
        aria-haspopup="dialog"
        disabled={busy === true}
      >
        Reject
      </button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          // A click on the dialog element itself is the backdrop.
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <Form method="post" className={styles.dialogForm}>
          <input type="hidden" name="intent" value="decide" />
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="decision" value="reject" />
          <h3 id={titleId} className={styles.title}>
            Reject this job?
          </h3>
          <p className={styles.hint}>
            The employee is told the job was rejected, with your reason if you give one. This cannot
            be undone.
          </p>
          {error !== null ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <label className={styles.field}>
            <span className={styles.label}>Reason (optional)</span>
            <input type="text" name="reason" maxLength={500} autoFocus />
          </label>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className={styles.rejectButton} disabled={busy === true}>
              {busy === true ? "Working…" : "Reject job"}
            </button>
          </div>
        </Form>
      </dialog>
    </span>
  );
}
