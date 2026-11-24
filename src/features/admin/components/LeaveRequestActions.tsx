import { useFetcher } from "react-router";
import { useId, useRef, useState } from "react";
import type { LeaveRow } from "../companyApi";
import type { LeaveActionResult } from "../leaveLoaders";
import { Spinner } from "../../../components/ui/Spinner";
import dialogStyles from "./JobSettingsDialog.module.css";
import styles from "./LeaveRequestActions.module.css";

type Decision = "approve" | "reject" | "revoke";

const COPY: Record<
  Decision,
  { open: string; title: string; hint: string; confirm: string; needsReason: boolean }
> = {
  approve: {
    open: "Approve",
    title: "Approve this leave?",
    hint: "Every day of the request becomes approved leave and the employee is told.",
    confirm: "Approve leave",
    needsReason: false,
  },
  reject: {
    open: "Reject",
    title: "Reject this leave request?",
    hint: "The employee is told the request was rejected, with your reason if you give one.",
    confirm: "Reject request",
    needsReason: false,
  },
  revoke: {
    open: "Revoke",
    title: "Revoke this approved leave?",
    hint: "Only days that have not started yet come back. The employee is told, with your reason.",
    confirm: "Revoke leave",
    needsReason: true,
  },
};

/** One request row's actions: a pending request offers Approve and Reject,
 *  an approved one offers Revoke. Each opens a small dialog; the decision
 *  posts through the row's own fetcher, so two rows never share a result —
 *  the dialog stays open on a failure with the error inside it. */
export function LeaveRequestActions({ request }: { request: LeaveRow }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);
  const [decision, setDecision] = useState<Decision>("approve");

  if (request.status !== "pending" && request.status !== "approved") return null;

  const open = (next: Decision) => {
    setDecision(next);
    setOpenCount((count) => count + 1);
    dialogRef.current?.showModal();
  };

  return (
    <span className={styles.wrap}>
      {request.status === "pending" ? (
        <>
          <button
            type="button"
            className={styles.approveButton}
            onClick={() => open("approve")}
            aria-haspopup="dialog"
          >
            Approve
          </button>
          <button
            type="button"
            className={styles.rejectButton}
            onClick={() => open("reject")}
            aria-haspopup="dialog"
          >
            Reject
          </button>
        </>
      ) : (
        <button
          type="button"
          className={styles.rejectButton}
          onClick={() => open("revoke")}
          aria-haspopup="dialog"
        >
          Revoke
        </button>
      )}
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-label={COPY[decision].title}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {openCount > 0 ? (
          <DecisionForm
            key={`${decision}-${openCount}`}
            decision={decision}
            requestId={request.id}
            close={() => dialogRef.current?.close()}
          />
        ) : null}
      </dialog>
    </span>
  );
}

/** The decision form inside the dialog. It remounts per open, so a reopened
 *  dialog never shows the previous decision's result; on a done decision it
 *  closes itself — the list refreshes through the loader's revalidation. */
function DecisionForm({
  decision,
  requestId,
  close,
}: {
  decision: Decision;
  requestId: string;
  close: () => void;
}) {
  const fetcher = useFetcher<LeaveActionResult>();
  const formId = useId();
  const [reason, setReason] = useState("");
  const copy = COPY[decision];
  const busy = fetcher.state !== "idle";
  // A stale decision (someone decided it first) keeps the dialog open with
  // the refresh line inside it — never hidden behind the overlay.
  const error =
    fetcher.data !== undefined && fetcher.data.state === "error" ? fetcher.data.message : null;
  const done = fetcher.data !== undefined && fetcher.data.state === "done";
  const reasonMissing = copy.needsReason && reason.trim() === "";
  return (
    <fetcher.Form method="post" className={dialogStyles.dialogForm} aria-labelledby={formId}>
      <input type="hidden" name="intent" value={decision} />
      <input type="hidden" name="id" value={requestId} />
      <h3 id={formId} className={dialogStyles.dialogTitle}>
        {copy.title}
      </h3>
      <p className={dialogStyles.dialogHint}>{copy.hint}</p>
      {decision !== "approve" ? (
        <label className={styles.field}>
          <span className={styles.label}>
            {copy.needsReason ? "Reason (required)" : "Reason (optional)"}
          </span>
          <input
            type="text"
            name="reason"
            value={reason}
            maxLength={500}
            autoFocus
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      ) : null}
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
              {busy ? "Working…" : copy.confirm}
            </button>
          </>
        )}
      </div>
    </fetcher.Form>
  );
}
