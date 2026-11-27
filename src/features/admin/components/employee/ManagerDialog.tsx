import { useFetcher } from "react-router";
// eslint-disable-next-line no-restricted-imports -- the effect syncs the host dialog's lock (Esc/backdrop hold) while the save posts; no server reads here
import { useEffect, useId, useState } from "react";
import type { MemberRow } from "../../companyApi";
import type { EmployeeProfile } from "../../employeeProfileApi";
import type { employeeProfileAction } from "../../employeeProfileLoaders";
import type { Slice } from "../../slice";
import { reparentNotice, sameManager, type HierarchyMember } from "../../memberHierarchy";
import { ManagerPicker } from "../ManagerPicker";
import { Button } from "../../../../components/ui/Button";
import { Spinner } from "../../../../components/ui/Spinner";
import dialogStyles from "../JobSettingsDialog.module.css";
import styles from "./ManagerDialog.module.css";

/**
 * The Reporting-manager dialog (Epic 24, CAP-6): the picker, then — when the
 * member has direct reports — an explicit confirmation of what the change
 * does before anything saves. A refusal keeps the dialog open on the stage
 * that failed, with the mapped sentence and the previous value untouched.
 */
export function ManagerDialog({
  member,
  directory,
  selfUserId,
  close,
  setLocked,
  retryRoster,
}: {
  member: EmployeeProfile;
  directory: Slice<MemberRow[]>;
  selfUserId: string;
  close: () => void;
  /** Host's dialog lock: Esc and backdrop are held while the save posts. */
  setLocked: (locked: boolean) => void;
  retryRoster: () => void;
}) {
  const save = useFetcher<typeof employeeProfileAction>();
  const titleId = useId();
  const [stage, setStage] = useState<"pick" | "confirm">("pick");
  const [selectedId, setSelectedId] = useState<string | null>(member.managerId);
  const busy = save.state !== "idle";
  useEffect(() => {
    setLocked(busy);
    return () => setLocked(false);
  }, [busy, setLocked]);

  const done = save.data?.kind === "manager" && save.data.state === "done";
  const error =
    save.data?.kind === "manager" && save.data.state === "error" ? save.data.message : null;
  const roster = directory.ok ? directory.data : [];
  const changed = !sameManager(selectedId, member.managerId);
  const notice = changed
    ? reparentNotice({
        memberName: member.name,
        directReports: member.directReports,
        managerId: selectedId,
        managerName: managerNameFor(selectedId, roster),
        selfUserId,
      })
    : null;

  const submit = (): void => {
    const body = new FormData();
    body.set("intent", "manager");
    body.set("managerId", selectedId ?? "");
    void save.submit(body, { method: "post" });
  };

  if (done) {
    return (
      <div className={dialogStyles.dialogForm}>
        <h3 id={titleId} className={dialogStyles.dialogTitle}>
          Reporting manager
        </h3>
        <p className={dialogStyles.savedMark} role="status">
          Reporting manager updated.
        </p>
        <div className={dialogStyles.dialogActions}>
          <Button variant="primary" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={dialogStyles.dialogForm}>
      <h3 id={titleId} className={dialogStyles.dialogTitle}>
        Reporting manager
      </h3>
      <p className={dialogStyles.dialogHint}>
        Who {member.name ?? "this person"} reports to. Requests from their team go to that person
        for approval.
      </p>
      {stage === "pick" ? (
        <>
          <ManagerPicker
            members={roster}
            memberId={member.userId}
            selectedId={selectedId}
            managerName={member.managerName}
            onSelect={setSelectedId}
            rosterFailed={!directory.ok}
            onRetry={retryRoster}
          />
          {error !== null ? (
            <p className={dialogStyles.dialogError} role="alert">
              {error}
            </p>
          ) : null}
          {!changed ? (
            <p id={`${titleId}-unchanged`} className={dialogStyles.dialogHint}>
              The reporting manager hasn't changed, so there is nothing to save.
            </p>
          ) : null}
          <div className={dialogStyles.dialogActions}>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={busy || !directory.ok || !changed}
              describedBy={!changed ? `${titleId}-unchanged` : undefined}
              onClick={() => {
                if (notice !== null) {
                  setStage("confirm");
                  return;
                }
                submit();
              }}
            >
              {busy ? <Spinner size={13} /> : null}
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.confirmText} role="status">
            {notice}
          </p>
          {error !== null ? (
            <p className={dialogStyles.dialogError} role="alert">
              {error}
            </p>
          ) : null}
          <div className={dialogStyles.dialogActions}>
            <Button variant="secondary" onClick={() => setStage("pick")} disabled={busy}>
              Back
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy} autoFocus>
              {busy ? <Spinner size={13} /> : null}
              {busy ? "Saving…" : "Confirm"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** The chosen manager's display name, for the re-parent sentence. */
function managerNameFor(managerId: string | null, roster: HierarchyMember[]): string | null {
  if (managerId === null) return null;
  return roster.find((member) => member.userId === managerId)?.name ?? null;
}
