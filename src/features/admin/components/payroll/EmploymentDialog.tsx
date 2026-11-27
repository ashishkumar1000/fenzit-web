import { useFetcher, useRevalidator } from "react-router";
import { useRef, useState } from "react";
import type { payrollEmploymentLoader } from "../../payrollLoaders";
import type { EmploymentView } from "../../payrollViews";
import { Spinner } from "../../../../components/ui/Spinner";
import { EMPLOYMENT_RESOURCE_PATH } from "../../employmentResource";
import { DEFAULT_EMPLOYMENT_SECTION, type EmploymentSection } from "../../employmentSections";
import { EmploymentForm } from "./EmploymentForm";
import dialogStyles from "../JobSettingsDialog.module.css";
import styles from "./EmploymentDialog.module.css";

/**
 * The Employees page's per-row Employment dialog, backed by the
 * `company/employees/employment` resource route: the loader answers the
 * open read, the action takes the save. The form is the same four-section
 * editor the profile page uses — one editor, one place statutory fields
 * ever appear. The shell here is the fixed chrome (title, scrolling body,
 * pinned footer); the form owns the fields, the rail and the save.
 */

type LoadedEmployment =
  { state: "ok"; employment: EmploymentView } | { state: "not-found" } | { state: "failed" };

/** The employees table's cell: a quiet button on active rows. The open read
 *  fires on click through the cell's own fetcher, so every open sees fresh
 *  data without an effect. */
export function EmploymentCell({ userId, name }: { userId: string; name: string | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);
  // Mid-save the dialog locks (CAP-5): a backdrop click or Esc cannot dismiss
  // it while the employment details post.
  const [locked, setLocked] = useState(false);
  const loader = useFetcher<typeof payrollEmploymentLoader>();
  const data = loader.data;
  return (
    <>
      <button
        type="button"
        className={styles.cellButton}
        onClick={() => {
          setOpenCount((count) => count + 1);
          loader.load(`${EMPLOYMENT_RESOURCE_PATH}?userId=${userId}`);
          dialogRef.current?.showModal();
        }}
        aria-haspopup="dialog"
      >
        Employment
      </button>
      <dialog
        ref={dialogRef}
        className={`${dialogStyles.dialog} ${dialogStyles.dialogRail} ${styles.wideDialog}`}
        aria-label={`Employment details for ${name ?? "employee"}`}
        onCancel={(event) => {
          if (locked) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current && !locked) dialogRef.current?.close();
        }}
      >
        {openCount > 0 ? (
          <EmploymentDialog
            key={openCount}
            result={data ?? { state: "loading" }}
            close={() => dialogRef.current?.close()}
            setLocked={setLocked}
            name={name}
          />
        ) : null}
      </dialog>
    </>
  );
}

export function EmploymentDialog({
  result,
  close,
  setLocked,
  name,
  initialSection,
}: {
  result: LoadedEmployment | { state: "loading" };
  close: () => void;
  /** Host's dialog lock (CAP-5): the form holds the host's dismissals while
   *  its save posts or edits are unsaved. Optional — hosts without the lock
   *  behave as before. */
  setLocked?: (locked: boolean) => void;
  /** The person's name for the header's quiet line; the host already has it. */
  name?: string | null;
  /** The section the host's link points at (the profile's Add links). */
  initialSection?: EmploymentSection;
}) {
  const revalidator = useRevalidator();
  const shellRef = useRef<HTMLDivElement>(null);
  const finish = (): void => {
    close();
    // The team table carries the employee code — refresh it once the
    // dialog's changes are in.
    if (revalidator.state === "idle") void revalidator.revalidate();
  };
  const isForm = result.state === "ok";
  return (
    <div className={styles.shell} data-rail={isForm ? "true" : "false"} ref={shellRef}>
      <header className={styles.header}>
        <h3 className={styles.title}>Employment details</h3>
        {name ? <p className={styles.subtitle}>{name}</p> : null}
      </header>
      {isForm ? (
        <EmploymentForm
          employment={result.employment}
          initialSection={initialSection ?? DEFAULT_EMPLOYMENT_SECTION}
          close={finish}
          setLocked={setLocked}
          containerRef={shellRef}
        />
      ) : (
        <>
          <div className={styles.simpleBody}>
            {result.state === "loading" ? (
              <>
                <Spinner size={20} />
                <p className={styles.simpleNote}>Loading employment details…</p>
              </>
            ) : result.state === "not-found" ? (
              <p className={dialogStyles.dialogError} role="alert">
                This person is not on the team any more.
              </p>
            ) : (
              <p className={dialogStyles.dialogError} role="alert">
                The details could not load. Close this and try again.
              </p>
            )}
          </div>
          <footer className={styles.simpleFooter}>
            <button type="button" className={dialogStyles.saveButton} onClick={close}>
              Close
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
