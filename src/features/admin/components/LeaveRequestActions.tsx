import { useFetcher } from "react-router";
import { useId, useRef, useState } from "react";
import type { LeaveRow } from "../companyApi";
import type { LeaveActionResult } from "../leaveLoaders";
import { Spinner } from "../../../components/ui/Spinner";
import dialogStyles from "./JobSettingsDialog.module.css";
import styles from "./LeaveRequestActions.module.css";

const REVOKE_TITLE = "Revoke this approved leave?";

/** One approved request row's single action: Revoke, behind a small dialog.
 *  The decision posts through the row's own fetcher, so two rows never share
 *  a result — the dialog stays open on a failure with the error inside it. */
export function LeaveRequestActions({ request }: { request: LeaveRow }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);

  if (request.status !== "approved") return null;

  const open = () => {
    setOpenCount((count) => count + 1);
    dialogRef.current?.showModal();
  };

  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.revokeButton} onClick={open} aria-haspopup="dialog">
        Revoke
      </button>
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-label={REVOKE_TITLE}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {openCount > 0 ? (
          <RevokeForm
            key={openCount}
            requestId={request.id}
            close={() => dialogRef.current?.close()}
          />
        ) : null}
      </dialog>
    </span>
  );
}

/** The revoke form inside the dialog. It remounts per open, so a reopened
 *  dialog never shows the previous result; on a done decision it closes
 *  itself — the list refreshes through the loader's revalidation. */
function RevokeForm({ requestId, close }: { requestId: string; close: () => void }) {
  const fetcher = useFetcher<LeaveActionResult>();
  const formId = useId();
  const [reason, setReason] = useState("");
  const busy = fetcher.state !== "idle";
  // A stale decision (someone decided it first) keeps the dialog open with
  // the refresh line inside it — never hidden behind the overlay.
  const error =
    fetcher.data !== undefined && fetcher.data.state === "error" ? fetcher.data.message : null;
  const done = fetcher.data !== undefined && fetcher.data.state === "done";
  const reasonMissing = reason.trim() === "";
  return (
    <fetcher.Form method="post" className={dialogStyles.dialogForm} aria-labelledby={formId}>
      <input type="hidden" name="intent" value="revoke" />
      <input type="hidden" name="id" value={requestId} />
      <h3 id={formId} className={dialogStyles.dialogTitle}>
        {REVOKE_TITLE}
      </h3>
      <p className={dialogStyles.dialogHint}>
        Only days that have not started yet come back. The employee is told, with your reason.
      </p>
      <label className={styles.field}>
        <span className={styles.label}>Reason (required)</span>
        <input
          type="text"
          name="reason"
          value={reason}
          maxLength={500}
          autoFocus
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      {reasonMissing ? (
        <p className={dialogStyles.dialogHint}>Give a reason — the employee sees it.</p>
      ) : null}
      {error ? (
        <p className={dialogStyles.dialogError} role="alert">
          {error}
        </p>
      ) : null}
      <div className={dialogStyles.dialogActions}>
        {done ? (
          <button type="button" className={dialogStyles.saveButton} onClick={close}>
            Close
          </button>
        ) : (
          <>
            <button
              type="button"
              className={dialogStyles.quietButton}
              onClick={close}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={dialogStyles.saveButton}
              disabled={busy || reasonMissing}
            >
              {busy ? <Spinner size={13} /> : null}
              {busy ? "Working…" : "Revoke leave"}
            </button>
          </>
        )}
      </div>
    </fetcher.Form>
  );
}
