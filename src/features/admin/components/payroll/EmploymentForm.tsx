import { useFetcher } from "react-router";
// eslint-disable-next-line no-restricted-imports -- the effects hold the dialog's dismiss guard and move focus when the discard prompt opens; no server reads here
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { Briefcase, IdCard, Landmark, UserRound } from "lucide-react";
import type { payrollEmploymentAction } from "../../payrollLoaders";
import type { EmploymentView } from "../../payrollViews";
import { Spinner } from "../../../../components/ui/Spinner";
import { TextInput } from "../../../../components/ui/TextInput";
import { EMPLOYMENT_RESOURCE_PATH } from "../../employmentResource";
import {
  EMPLOYMENT_FIELD_RULES,
  EMPLOYMENT_FIELDS,
  EMPLOYMENT_SECTIONS,
  SECTION_FIELDS,
  SECTION_LABELS,
  type EmploymentField,
  type EmploymentSection,
} from "../../employmentSections";
import dialogStyles from "../JobSettingsDialog.module.css";
import styles from "./EmploymentForm.module.css";

/**
 * The employment dialog's body: four sections behind a tab rail, the same
 * fifteen fields and the same tri-state save. The rail opens on the section
 * the host asked for (the profile's Add links land on the field they point
 * at), every tab carries its unsaved count, and the footer warns before a
 * close would drop edits. Only the open section is mounted; the values live
 * above it, so switching never loses a keystroke.
 */

const SECTION_ICONS = {
  job: Briefcase,
  personal: UserRound,
  statutory: IdCard,
  bank: Landmark,
} as const;

const asText = (value: string | null): string => value ?? "";

function seedValues(employment: EmploymentView): Record<EmploymentField, string> {
  const seed = {} as Record<EmploymentField, string>;
  for (const field of EMPLOYMENT_FIELDS) seed[field] = asText(employment[field]);
  return seed;
}

/** The BE's `format` decides the control, not a second local list. */
const fieldType = (field: EmploymentField): "date" | "text" =>
  EMPLOYMENT_FIELD_RULES[field].format === "date" ? "date" : "text";

export function EmploymentForm({
  employment,
  initialSection,
  close,
  setLocked,
  containerRef,
}: {
  employment: EmploymentView;
  initialSection: EmploymentSection;
  close: () => void;
  setLocked?: (locked: boolean) => void;
  /** The shell the form renders into — the form walks up to its `<dialog>`
   *  to catch Esc, which the host binds. */
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const save = useFetcher<typeof payrollEmploymentAction>();
  const baseId = useId();
  const [values, setValues] = useState<Record<EmploymentField, string>>(() =>
    seedValues(employment),
  );
  const [section, setSection] = useState<EmploymentSection>(initialSection);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const prompted = useRef(false);
  const tabRefs = useRef<Partial<Record<EmploymentSection, HTMLButtonElement | null>>>({});

  const busy = save.state !== "idle";
  const done = save.data?.state === "done";
  const error = save.data?.state === "error" ? save.data.message : null;
  const notFound = save.data?.state === "not-found";

  const dirtyFields = EMPLOYMENT_FIELDS.filter(
    (field) => values[field].trim() !== asText(employment[field]),
  );
  const dirtyTotal = dirtyFields.length;
  const dirtyFor = (key: EmploymentSection): number =>
    SECTION_FIELDS[key].filter((field) => dirtyFields.includes(field)).length;
  const codeCleared = employment.employeeCode !== "" && values.employeeCode.trim() === "";
  // Only warn when the change is real: an employee who never had a joining
  // date is not being taken out of payroll by this edit.
  const joinDateCleared = asText(employment.joinDate) !== "" && values.joinDate.trim() === "";

  // The host dialog holds its backdrop/Esc while a save posts or edits are
  // unsaved — a dismiss must never silently drop a change.
  useEffect(() => {
    setLocked?.(!notFound && (busy || (dirtyTotal > 0 && !done)));
    return () => setLocked?.(false);
  }, [busy, dirtyTotal, done, notFound, setLocked]);

  // Esc is a native cancel on the host's dialog, so the form listens there.
  // With edits pending it opens the footer's discard prompt instead of closing.
  useEffect(() => {
    const dialog = containerRef.current?.closest("dialog");
    if (!dialog) return;
    const onCancel = (event: Event) => {
      if (notFound || busy || done || dirtyTotal === 0) return;
      event.preventDefault();
      setConfirmDiscard(true);
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [busy, done, dirtyTotal, notFound, containerRef]);

  useEffect(() => {
    if (confirmDiscard) {
      prompted.current = true;
      keepEditingRef.current?.focus();
    } else if (prompted.current) {
      prompted.current = false;
      cancelRef.current?.focus();
    }
  }, [confirmDiscard]);

  const set = (field: EmploymentField, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const requestClose = (): void => {
    if (busy) return;
    if (dirtyTotal > 0 && !done) {
      setConfirmDiscard(true);
      return;
    }
    close();
  };

  const focusTab = (next: EmploymentSection): void => {
    setSection(next);
    tabRefs.current[next]?.focus();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, key: EmploymentSection): void => {
    const index = EMPLOYMENT_SECTIONS.indexOf(key);
    let next: EmploymentSection | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = EMPLOYMENT_SECTIONS[(index + 1) % EMPLOYMENT_SECTIONS.length] ?? null;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next =
        EMPLOYMENT_SECTIONS[
          (index - 1 + EMPLOYMENT_SECTIONS.length) % EMPLOYMENT_SECTIONS.length
        ] ?? null;
    } else if (event.key === "Home") {
      next = EMPLOYMENT_SECTIONS[0] ?? null;
    } else if (event.key === "End") {
      next = EMPLOYMENT_SECTIONS[EMPLOYMENT_SECTIONS.length - 1] ?? null;
    }
    if (next === null) return;
    event.preventDefault();
    focusTab(next);
  };

  const submit = (): void => {
    const body = new FormData();
    body.set("userId", employment.userId);
    for (const field of EMPLOYMENT_FIELDS) {
      const next = values[field].trim();
      // Only the fields that differ ride the request — the BE's tri-state
      // contract: absent = leave alone, empty = clear.
      if (next !== asText(employment[field])) body.set(field, next);
    }
    if (body.has("employeeCode") && body.get("employeeCode") === "") return;
    void save.submit(body, { method: "post", action: EMPLOYMENT_RESOURCE_PATH });
  };

  const rail = (
    <div className={styles.rail} role="tablist" aria-label="Employment details sections">
      {EMPLOYMENT_SECTIONS.map((key) => {
        const Icon = SECTION_ICONS[key];
        // Saved values are the baseline now; the counts speak for pending
        // edits only, so they clear the moment the save lands.
        const count = done ? 0 : dirtyFor(key);
        const label = SECTION_LABELS[key];
        const selected = section === key;
        return (
          <button
            key={key}
            ref={(element) => {
              tabRefs.current[key] = element;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${key}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel`}
            tabIndex={selected ? 0 : -1}
            className={styles.tab}
            onClick={() => setSection(key)}
            onKeyDown={(event) => onTabKeyDown(event, key)}
            aria-label={
              count > 0 ? `${label}, ${count} unsaved ${count === 1 ? "change" : "changes"}` : label
            }
          >
            <Icon className={styles.tabIcon} size={16} strokeWidth={2} aria-hidden="true" />
            {label}
            {count > 0 ? (
              <span className={styles.tabCount} aria-hidden="true">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  if (notFound) {
    return (
      <>
        {rail}
        <div className={styles.body}>
          <p className={styles.notFound} role="alert">
            This person is not on the team any more.
          </p>
        </div>
        <footer className={styles.footer}>
          <div className={styles.footerActions}>
            <button
              type="button"
              className={`${dialogStyles.saveButton} ${styles.footerButton}`}
              onClick={close}
            >
              Close
            </button>
          </div>
        </footer>
      </>
    );
  }

  const note = done
    ? "Saved. The profile now shows the current details."
    : dirtyTotal === 0
      ? "Change a field to save. Emptying one clears it."
      : `${dirtyTotal} ${dirtyTotal === 1 ? "change" : "changes"} ready. Emptying a field clears it.`;

  return (
    <>
      {rail}
      <div
        className={styles.body}
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${section}`}
        tabIndex={-1}
      >
        <div className={styles.panel}>
          <div className={styles.fieldGrid}>{renderFields(section)}</div>
        </div>
      </div>
      <footer className={styles.footer}>
        {confirmDiscard ? (
          <>
            <div className={styles.footerText}>
              <p className={styles.confirmText} role="alert">
                Discard your changes?
              </p>
            </div>
            <div className={styles.footerActions}>
              <button
                ref={keepEditingRef}
                type="button"
                className={`${dialogStyles.quietButton} ${styles.footerButton}`}
                onClick={() => setConfirmDiscard(false)}
              >
                Keep editing
              </button>
              <button
                type="button"
                className={`${styles.discardButton} ${styles.footerButton}`}
                onClick={close}
              >
                Discard changes
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.footerText}>
              {error !== null ? (
                <p id={`${baseId}-save-problem`} className={styles.footerProblem} role="alert">
                  {error}
                </p>
              ) : codeCleared ? (
                <p id={`${baseId}-save-problem`} className={styles.footerProblem}>
                  The employee code cannot be cleared.
                </p>
              ) : (
                <p
                  id={`${baseId}-save-note`}
                  className={done ? dialogStyles.savedMark : styles.footerNote}
                  role={done ? "status" : undefined}
                >
                  {note}
                </p>
              )}
            </div>
            <div className={styles.footerActions}>
              <button
                ref={cancelRef}
                type="button"
                className={`${dialogStyles.quietButton} ${styles.footerButton}`}
                onClick={requestClose}
                disabled={busy}
              >
                {done ? "Close" : "Cancel"}
              </button>
              {done ? null : (
                <button
                  type="button"
                  className={`${dialogStyles.saveButton} ${styles.footerButton}`}
                  onClick={submit}
                  disabled={busy || codeCleared || dirtyTotal === 0}
                  aria-busy={busy ? true : undefined}
                  aria-describedby={
                    error !== null || codeCleared ? `${baseId}-save-problem` : `${baseId}-save-note`
                  }
                >
                  {busy ? <Spinner size={13} /> : null}
                  {busy ? "Saving…" : "Save"}
                </button>
              )}
            </div>
          </>
        )}
      </footer>
    </>
  );

  function renderFields(key: EmploymentSection): ReactNode {
    switch (key) {
      case "job":
        return (
          <>
            <TextInput
              id={`${baseId}-code`}
              variant="floating"
              label="Employee code"
              value={values.employeeCode}
              onChange={(value) => set("employeeCode", value)}
              maxLength={EMPLOYMENT_FIELD_RULES.employeeCode.maxLength}
              error={codeCleared ? "The employee code cannot be cleared." : undefined}
            />
            <TextInput
              id={`${baseId}-join`}
              variant="floating"
              label="Joining date"
              type={fieldType("joinDate")}
              value={values.joinDate}
              onChange={(value) => set("joinDate", value)}
              hint={joinDateCleared ? "This employee will be left out of salary runs." : undefined}
            />
            <TextInput
              id={`${baseId}-exit`}
              variant="floating"
              label="Leaving date"
              type={fieldType("exitDate")}
              value={values.exitDate}
              onChange={(value) => set("exitDate", value)}
            />
            <TextInput
              id={`${baseId}-designation`}
              variant="floating"
              label="Designation"
              value={values.designation}
              onChange={(value) => set("designation", value)}
              maxLength={EMPLOYMENT_FIELD_RULES.designation.maxLength}
            />
            <div className={styles.fieldWide}>
              <TextInput
                id={`${baseId}-department`}
                variant="floating"
                label="Department"
                value={values.department}
                onChange={(value) => set("department", value)}
                maxLength={EMPLOYMENT_FIELD_RULES.department.maxLength}
              />
            </div>
          </>
        );
      case "personal":
        return (
          <>
            <TextInput
              id={`${baseId}-dob`}
              variant="floating"
              label="Date of birth"
              type={fieldType("dateOfBirth")}
              value={values.dateOfBirth}
              onChange={(value) => set("dateOfBirth", value)}
            />
            <TextInput
              id={`${baseId}-father`}
              variant="floating"
              label="Father's name"
              value={values.fatherName}
              onChange={(value) => set("fatherName", value)}
              maxLength={EMPLOYMENT_FIELD_RULES.fatherName.maxLength}
            />
            <TextInput
              id={`${baseId}-mother`}
              variant="floating"
              label="Mother's name"
              value={values.motherName}
              onChange={(value) => set("motherName", value)}
              maxLength={EMPLOYMENT_FIELD_RULES.motherName.maxLength}
            />
            <TextInput
              id={`${baseId}-spouse`}
              variant="floating"
              label="Spouse's name"
              value={values.spouseName}
              onChange={(value) => set("spouseName", value)}
              maxLength={EMPLOYMENT_FIELD_RULES.spouseName.maxLength}
            />
          </>
        );
      case "statutory":
        return (
          <>
            <TextInput
              id={`${baseId}-pan`}
              variant="floating"
              label="PAN"
              value={values.pan}
              onChange={(value) => set("pan", value.toUpperCase())}
              maxLength={EMPLOYMENT_FIELD_RULES.pan.maxLength}
              hint="Ten characters, like ABCPE1234F."
            />
            <TextInput
              id={`${baseId}-uan`}
              variant="floating"
              label="UAN"
              value={values.uanNumber}
              onChange={(value) => set("uanNumber", value)}
              maxLength={EMPLOYMENT_FIELD_RULES.uanNumber.maxLength}
              hint="A UAN means PF always applies to this employee."
            />
            <div className={styles.fieldWide}>
              <TextInput
                id={`${baseId}-pf`}
                variant="floating"
                label="PF account number"
                value={values.pfAccountNumber}
                onChange={(value) => set("pfAccountNumber", value)}
                maxLength={EMPLOYMENT_FIELD_RULES.pfAccountNumber.maxLength}
                hint="Like PY/ABC/12345/000."
              />
            </div>
          </>
        );
      case "bank":
        return (
          <>
            <div className={styles.fieldWide}>
              <TextInput
                id={`${baseId}-account`}
                variant="floating"
                label="Account number"
                value={values.bankAccountNumber}
                onChange={(value) => set("bankAccountNumber", value)}
                maxLength={EMPLOYMENT_FIELD_RULES.bankAccountNumber.maxLength}
              />
            </div>
            <TextInput
              id={`${baseId}-ifsc`}
              variant="floating"
              label="IFSC"
              value={values.ifscCode}
              onChange={(value) => set("ifscCode", value.toUpperCase())}
              maxLength={EMPLOYMENT_FIELD_RULES.ifscCode.maxLength}
              hint="Eleven characters, like HDFC0001234."
            />
            <TextInput
              id={`${baseId}-bank`}
              variant="floating"
              label="Bank name"
              value={values.bankName}
              onChange={(value) => set("bankName", value)}
              maxLength={EMPLOYMENT_FIELD_RULES.bankName.maxLength}
            />
          </>
        );
    }
  }
}
