import { useRef, useState } from "react";
import type { MemberRow } from "../../companyApi";
import type { EmployeeProfile } from "../../employeeProfileApi";
import type { Slice } from "../../slice";
import { headcountLine, reportsToLine, roleMap } from "../../memberHierarchy";
import { ManagerDialog } from "./ManagerDialog";
import { Button } from "../../../../components/ui/Button";
import dialogStyles from "../JobSettingsDialog.module.css";
import styles from "./ReportingBlock.module.css";

/**
 * The member record's "Reports to" block (Epic 24, CAP-6): the upward chain
 * with the top admin marked, the headcount below the person, and the one
 * Change control that opens the reporting-manager dialog. An admin sits at
 * the top and has no Change control; a failed roster still shows the stored
 * chain (without the mark) and says why the change is unavailable.
 */
export function ReportingBlock({
  member,
  directory,
  selfUserId,
  retryRoster,
}: {
  member: EmployeeProfile;
  directory: Slice<MemberRow[]>;
  selfUserId: string;
  retryRoster: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);
  // The dialog holds its own dismissals while the save posts.
  const [locked, setLocked] = useState(false);
  const roles = directory.ok ? roleMap(directory.data) : new Map<string, string>();
  const reports = headcountLine(member.headcount);
  const isAdmin = member.role === "company_admin";
  const canEdit = !isAdmin;

  const open = (): void => {
    setOpenCount((count) => count + 1);
    dialogRef.current?.showModal();
  };

  return (
    <div className={styles.block}>
      <div className={styles.facts}>
        <span className={styles.label}>Reports to</span>
        <span className={styles.value}>{reportsToLine(member, roles)}</span>
        {reports !== null ? <span className={styles.muted}>{reports}</span> : null}
      </div>
      {canEdit ? (
        directory.ok ? (
          <Button variant="secondary" size="compact" onClick={open}>
            Change
          </Button>
        ) : (
          <div className={styles.unavailable}>
            <span className={styles.muted}>
              Reporting manager can't be changed until your team loads.
            </span>
            <Button variant="secondary" size="compact" onClick={retryRoster}>
              Try Again
            </Button>
          </div>
        )
      ) : null}
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-label={`Reporting manager for ${member.name ?? "this person"}`}
        onCancel={(event) => {
          if (locked) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current && !locked) dialogRef.current?.close();
        }}
      >
        {openCount > 0 ? (
          <ManagerDialog
            key={openCount}
            member={member}
            directory={directory}
            selfUserId={selfUserId}
            close={() => dialogRef.current?.close()}
            setLocked={setLocked}
            retryRoster={retryRoster}
          />
        ) : null}
      </dialog>
    </div>
  );
}
