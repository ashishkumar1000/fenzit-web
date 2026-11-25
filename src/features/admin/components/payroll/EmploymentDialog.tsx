import { useFetcher, useRevalidator } from "react-router";
import { useId, useRef, useState } from "react";
import type { payrollEmploymentAction, payrollEmploymentLoader } from "../../payrollLoaders";
import type { EmploymentView } from "../../payrollViews";
import { Spinner } from "../../../../components/ui/Spinner";
import { TextInput } from "../../../../components/ui/TextInput";
import dialogStyles from "../JobSettingsDialog.module.css";
import styles from "./EmploymentDialog.module.css";

/**
 * The Employees page's per-row Employment dialog, backed by the
 * `company/employees/employment` resource route: the loader answers the
 * open read, the action takes the save. The body is a computed diff — a
 * field rides only when its value differs from the loaded row, and an
 * emptied touched field clears (the action turns its `""` into the BE's
 * JSON-null clear verb), so untouched fields are never on the wire and
 * nothing can be cleared by accident. PAN, date of birth and bank details
 * show here and nowhere else.
 */

export const EMPLOYMENT_RESOURCE_PATH = "/admin/company/employees/employment";

type LoadedEmployment =
  { state: "ok"; employment: EmploymentView } | { state: "not-found" } | { state: "failed" };

/** The employees table's cell: a quiet button on active rows. The open read
 *  fires on click through the cell's own fetcher, so every open sees fresh
 *  data without an effect. */
export function EmploymentCell({ userId, name }: { userId: string; name: string | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);
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
        className={`${dialogStyles.dialog} ${styles.wideDialog}`}
        aria-label={`Employment details for ${name ?? "employee"}`}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {openCount > 0 ? (
          <EmploymentDialog
            key={openCount}
            result={data ?? { state: "loading" }}
            close={() => dialogRef.current?.close()}
          />
        ) : null}
      </dialog>
    </>
  );
}

export function EmploymentDialog({
  result,
  close,
}: {
  result: LoadedEmployment | { state: "loading" };
  close: () => void;
}) {
  const revalidator = useRevalidator();
  const finish = (): void => {
    close();
    // The team table carries the employee code — refresh it once the
    // dialog's changes are in.
    if (revalidator.state === "idle") void revalidator.revalidate();
  };
  return (
    <div className={dialogStyles.dialogForm}>
      {result.state === "loading" ? (
        <div className={styles.loadingBlock}>
          <Spinner size={20} />
          <p>Loading employment details…</p>
        </div>
      ) : result.state === "not-found" ? (
        <>
          <h3 className={dialogStyles.dialogTitle}>Employment details</h3>
          <p className={dialogStyles.dialogError} role="alert">
            This person is not on the team any more.
          </p>
          <div className={dialogStyles.dialogActions}>
            <button type="button" className={dialogStyles.saveButton} onClick={close}>
              Close
            </button>
          </div>
        </>
      ) : result.state === "failed" ? (
        <>
          <h3 className={dialogStyles.dialogTitle}>Employment details</h3>
          <p className={dialogStyles.dialogError} role="alert">
            The details could not load. Close this and try again.
          </p>
          <div className={dialogStyles.dialogActions}>
            <button type="button" className={dialogStyles.saveButton} onClick={close}>
              Close
            </button>
          </div>
        </>
      ) : (
        <EmploymentForm employment={result.employment} close={finish} />
      )}
    </div>
  );
}

const FIELDS = [
  "employeeCode",
  "joinDate",
  "exitDate",
  "designation",
  "department",
  "dateOfBirth",
  "fatherName",
  "motherName",
  "spouseName",
  "pan",
  "uanNumber",
  "pfAccountNumber",
  "bankAccountNumber",
  "ifscCode",
  "bankName",
] as const;

type FieldKey = (typeof FIELDS)[number];

const asText = (value: string | null): string => value ?? "";

function EmploymentForm({ employment, close }: { employment: EmploymentView; close: () => void }) {
  const save = useFetcher<typeof payrollEmploymentAction>();
  const titleId = useId();
  const [values, setValues] = useState<Record<FieldKey, string>>(() => {
    const seed = {} as Record<FieldKey, string>;
    for (const field of FIELDS) seed[field] = asText(employment[field]);
    return seed;
  });
  const busy = save.state !== "idle";
  const done = save.data?.state === "done";
  const error = save.data?.state === "error" ? save.data.message : null;
  const notFound = save.data?.state === "not-found";

  const set = (field: FieldKey, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const codeCleared = employment.employeeCode !== "" && values.employeeCode.trim() === "";

  const submit = (): void => {
    const body = new FormData();
    body.set("userId", employment.userId);
    for (const field of FIELDS) {
      const next = values[field].trim();
      // Only the fields that differ ride the request — the BE's tri-state
      // contract: absent = leave alone, empty = clear.
      if (next !== asText(employment[field])) body.set(field, next);
    }
    if (body.has("employeeCode") && body.get("employeeCode") === "") return;
    void save.submit(body, { method: "post", action: EMPLOYMENT_RESOURCE_PATH });
  };

  if (notFound) {
    return (
      <>
        <h3 id={titleId} className={dialogStyles.dialogTitle}>
          Employment details
        </h3>
        <p className={dialogStyles.dialogError} role="alert">
          This person is not on the team any more.
        </p>
        <div className={dialogStyles.dialogActions}>
          <button type="button" className={dialogStyles.saveButton} onClick={close}>
            Close
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h3 id={titleId} className={dialogStyles.dialogTitle}>
        Employment details — {employment.employeeCode}
      </h3>
      {done ? (
        <p className={dialogStyles.savedMark} role="status">
          Saved. The team list now shows the current details.
        </p>
      ) : null}
      <fieldset className={styles.group}>
        <legend>Job</legend>
        <div className={styles.fieldGrid}>
          <TextInput
            id={`${titleId}-code`}
            label="Employee code"
            value={values.employeeCode}
            onChange={(value) => set("employeeCode", value)}
            maxLength={50}
            hint="Unique in the company; it cannot be cleared."
            error={codeCleared ? "The employee code cannot be cleared." : undefined}
          />
          <TextInput
            id={`${titleId}-join`}
            label="Joining date"
            type="date"
            value={values.joinDate}
            onChange={(value) => set("joinDate", value)}
            hint="Clear it to leave this employee out of salary runs."
          />
          <TextInput
            id={`${titleId}-exit`}
            label="Leaving date"
            type="date"
            value={values.exitDate}
            onChange={(value) => set("exitDate", value)}
          />
          <TextInput
            id={`${titleId}-designation`}
            label="Designation"
            value={values.designation}
            onChange={(value) => set("designation", value)}
            maxLength={100}
          />
          <TextInput
            id={`${titleId}-department`}
            label="Department"
            value={values.department}
            onChange={(value) => set("department", value)}
            maxLength={100}
          />
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Personal</legend>
        <div className={styles.fieldGrid}>
          <TextInput
            id={`${titleId}-dob`}
            label="Date of birth"
            type="date"
            value={values.dateOfBirth}
            onChange={(value) => set("dateOfBirth", value)}
          />
          <TextInput
            id={`${titleId}-father`}
            label="Father's name"
            value={values.fatherName}
            onChange={(value) => set("fatherName", value)}
            maxLength={100}
          />
          <TextInput
            id={`${titleId}-mother`}
            label="Mother's name"
            value={values.motherName}
            onChange={(value) => set("motherName", value)}
            maxLength={100}
          />
          <TextInput
            id={`${titleId}-spouse`}
            label="Spouse's name"
            value={values.spouseName}
            onChange={(value) => set("spouseName", value)}
            maxLength={100}
          />
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Statutory IDs</legend>
        <div className={styles.fieldGrid}>
          <TextInput
            id={`${titleId}-pan`}
            label="PAN"
            value={values.pan}
            onChange={(value) => set("pan", value.toUpperCase())}
            maxLength={10}
            hint="Ten characters, like ABCPE1234F."
          />
          <TextInput
            id={`${titleId}-uan`}
            label="UAN"
            value={values.uanNumber}
            onChange={(value) => set("uanNumber", value)}
            maxLength={20}
            hint="A UAN means PF always applies to this employee."
          />
          <TextInput
            id={`${titleId}-pf`}
            label="PF account number"
            value={values.pfAccountNumber}
            onChange={(value) => set("pfAccountNumber", value)}
            maxLength={50}
            hint="Like PY/ABC/12345/000."
          />
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Bank</legend>
        <div className={styles.fieldGrid}>
          <TextInput
            id={`${titleId}-account`}
            label="Account number"
            value={values.bankAccountNumber}
            onChange={(value) => set("bankAccountNumber", value)}
            maxLength={35}
          />
          <TextInput
            id={`${titleId}-ifsc`}
            label="IFSC"
            value={values.ifscCode}
            onChange={(value) => set("ifscCode", value.toUpperCase())}
            maxLength={11}
            hint="Eleven characters, like HDFC0001234."
          />
          <TextInput
            id={`${titleId}-bank`}
            label="Bank name"
            value={values.bankName}
            onChange={(value) => set("bankName", value)}
            maxLength={100}
          />
        </div>
      </fieldset>
      {error !== null ? (
        <p className={dialogStyles.dialogError} role="alert">
          {error}
        </p>
      ) : null}
      <div className={dialogStyles.dialogActions}>
        <button type="button" className={dialogStyles.quietButton} onClick={close} disabled={busy}>
          {done ? "Close" : "Cancel"}
        </button>
        {done ? null : (
          <button
            type="button"
            className={dialogStyles.saveButton}
            onClick={submit}
            disabled={busy || codeCleared}
          >
            {busy ? <Spinner size={13} /> : null}
            {busy ? "Saving…" : "Save"}
          </button>
        )}
      </div>
    </>
  );
}
