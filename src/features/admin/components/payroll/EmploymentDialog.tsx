import { useRevalidator } from "react-router";
import { useRef } from "react";
import type { EmploymentView } from "../../payrollViews";
import { Spinner } from "../../../../components/ui/Spinner";
import { DEFAULT_EMPLOYMENT_SECTION, type EmploymentSection } from "../../employmentSections";
import { EmploymentForm } from "./EmploymentForm";
import dialogStyles from "../JobSettingsDialog.module.css";
import styles from "./EmploymentDialog.module.css";

/**
 * The employment dialog the profile page hosts, backed by the
 * `company/employees/employment` resource route: the loader answers the
 * open read, the action takes the save. The form is the same four-section
 * editor the profile page uses — one editor, one place statutory fields
 * ever appear. The shell here is the fixed chrome (title, scrolling body,
 * pinned footer); the form owns the fields, the rail and the save. (The
 * team table's row-level cell retired with its column, 2026-11-28.)
 */

type LoadedEmployment =
  { state: "ok"; employment: EmploymentView } | { state: "not-found" } | { state: "failed" };

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
    // The host profile shows what the dialog changed — its revalidation
    // brings the master record back with the saved values.
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
