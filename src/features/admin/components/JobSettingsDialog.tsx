import { Form, useActionData, useNavigation } from "react-router";
import { useId, useRef, useState } from "react";
import {
  ApprovalTagIcon,
  PowerIcon,
  ZapIcon,
  type ConsoleIconProps,
} from "../../../components/ui/consoleIcons";
import type { EmployeesActionResult } from "../adminBrowseLoaders";
import { Spinner } from "../../../components/ui/Spinner";
import styles from "./JobSettingsDialog.module.css";

/** The chip's colour and icon say the setting at a glance: violet tag for the
 *  full create+approval, green bolt for plain create ("Creates jobs"), gray
 *  power mark for off. */
function chipSummary(row: { canCreateJobs: boolean; jobApprovalRequired: boolean }): {
  label: string;
  variant: "approval" | "create" | "off";
  Icon: ((props: ConsoleIconProps) => React.ReactNode) | null;
} {
  if (!row.canCreateJobs) return { label: "Off", variant: "off", Icon: PowerIcon };
  if (row.jobApprovalRequired) {
    return { label: "Create + approval", variant: "approval", Icon: ApprovalTagIcon };
  }
  return { label: "Creates jobs", variant: "create", Icon: ZapIcon };
}

/**
 * The row's job-settings control (Epic 22, CAP-1): a summary of the two
 * owner-set switches that opens the change form. Employees only — owners and
 * viewers do not create jobs. The result rides the page's action data; the
 * mark belongs to the save that produced it, and a reopened dialog starts
 * without it.
 */
export function JobSettingsCell({
  row,
}: {
  row: { userId: string; canCreateJobs: boolean; jobApprovalRequired: boolean };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const action = useActionData<EmployeesActionResult>();
  const navigation = useNavigation();
  const chip = chipSummary(row);
  const busy =
    navigation.state === "submitting" && navigation.formData?.get("userId") === row.userId;
  // Only this row's own settings save marks it — an invite or resend result
  // carries a different `kind`.
  const saved =
    action?.kind === "job-settings" && action.state === "done" && action.userId === row.userId;
  const error =
    action?.kind === "job-settings" && action.state === "error" && action.userId === row.userId
      ? action.message
      : null;
  // The mark belongs to the save that produced it. React's render-phase state
  // adjustment: when a new action arrives, adopt it — so reopening the dialog
  // with an old action does not claim "Job settings saved." again, and a fresh
  // save does.
  const [seenAction, setSeenAction] = useState<unknown>(null);
  const [markVisible, setMarkVisible] = useState(false);
  // Approval only means something once the employee can create jobs, so the
  // switch is off and disabled while "Can create jobs" is off. A disabled
  // checkbox is not submitted, so the save stores approval as off.
  const [createOn, setCreateOn] = useState(row.canCreateJobs);
  const [approvalOn, setApprovalOn] = useState(row.jobApprovalRequired);
  if (action !== seenAction) {
    setSeenAction(action);
    setMarkVisible(saved);
  }
  return (
    <span className={styles.settingsCell}>
      <button
        type="button"
        className={styles.settingsButton}
        data-variant={chip.variant}
        onClick={() => {
          setMarkVisible(false); // A reopened dialog shows the switches, not the last save's mark.
          setCreateOn(row.canCreateJobs);
          setApprovalOn(row.jobApprovalRequired);
          if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
        }}
        aria-haspopup="dialog"
      >
        {chip.Icon ? <chip.Icon size={14} strokeWidth={2} className={styles.chipIcon} /> : null}
        {chip.label}
      </button>
      {/* A native dialog: modal focus, Escape-to-close and the dimmed backdrop
          come from the element; a click on the backdrop also closes it. The
          dialog stays open after a save so the saved line is seen. */}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <Form method="post" className={styles.dialogForm}>
          <input type="hidden" name="intent" value="job-settings" />
          <input type="hidden" name="userId" value={row.userId} />
          <h3 id={titleId} className={styles.dialogTitle}>
            Job settings
          </h3>
          <p className={styles.dialogHint}>
            Changes apply to the next job this employee creates. Jobs already waiting stay as they
            are.
          </p>
          <label className={styles.switchRow}>
            <input
              type="checkbox"
              name="canCreateJobs"
              checked={createOn}
              onChange={(event) => setCreateOn(event.target.checked)}
            />
            <span>
              Can create jobs
              <small>They record their own visits and tasks.</small>
            </span>
          </label>
          <label className={styles.switchRow}>
            <input
              type="checkbox"
              name="jobApprovalRequired"
              checked={createOn && approvalOn}
              disabled={!createOn}
              onChange={(event) => setApprovalOn(event.target.checked)}
            />
            <span>
              Approval needed
              <small>
                {createOn
                  ? "New jobs wait for your approval first."
                  : "Turn on Can create jobs first."}
              </small>
            </span>
          </label>
          {error ? (
            <p className={styles.dialogError} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.dialogActions}>
            {markVisible ? (
              <>
                <p className={styles.savedMark} role="status">
                  Job settings saved.
                </p>
                {/* A saved dialog only needs to be closed — another Save
                    would double-submit the same switches. */}
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={() => dialogRef.current?.close()}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.quietButton}
                  onClick={() => dialogRef.current?.close()}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveButton} disabled={busy === true}>
                  {busy === true ? <Spinner size={13} /> : null}
                  {busy === true ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </Form>
      </dialog>
    </span>
  );
}
