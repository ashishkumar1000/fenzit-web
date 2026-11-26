import { useFetcher } from "react-router";
// eslint-disable-next-line no-restricted-imports -- the effect syncs the dialog lock (Esc/backdrop hold) while the save posts; no server reads here
import { useEffect, useId, useRef, useState } from "react";
import type { InviteResult } from "../adminBrowseLoaders";
import { smsOutcome } from "../smsOutcome";
import { DEFAULT_DIAL_CODE, type CountryCode } from "../../../services/countryCodes";
import { Spinner } from "../../../components/ui/Spinner";
import { TextInput } from "../../../components/ui/TextInput";
import { DialCodeSelect } from "../../../components/ui/DialCodeSelect";
import dialogStyles from "./JobSettingsDialog.module.css";
import styles from "./AddEmployeeDialog.module.css";

/** The top bar's "Invite employee" control. The dialog stays mounted so the
 *  click can always open it; the form inside remounts per open (the `key`),
 *  so a reopened dialog never shows the previous invite's result. */
export function AddEmployeeControl({ countries }: { countries: CountryCode[] | undefined }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);
  // Mid-send the dialog locks (CAP-5): a backdrop click or Esc cannot dismiss
  // it while the invite posts — an accidental dismissal would abandon a send
  // that may already have gone out.
  const [locked, setLocked] = useState(false);
  return (
    <>
      <button
        type="button"
        className={styles.addButton}
        onClick={() => {
          setOpenCount((count) => count + 1);
          dialogRef.current?.showModal();
        }}
        aria-haspopup="dialog"
      >
        Invite Employee
      </button>
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-label="Invite Employee"
        onCancel={(event) => {
          if (locked) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current && !locked) dialogRef.current?.close();
        }}
      >
        {openCount > 0 && countries !== undefined ? (
          <AddEmployeeForm
            key={openCount}
            countries={countries}
            close={() => dialogRef.current?.close()}
            setLocked={setLocked}
          />
        ) : null}
      </dialog>
    </>
  );
}

/** The add-employee form inside the dialog: name and phone, then
 *  POST /auth/invite through a fetcher, so the page's own action data stays
 *  untouched. The loader refetches after the action, and the new row appears
 *  as Invited. */
function AddEmployeeForm({
  countries,
  close,
  setLocked,
}: {
  countries: CountryCode[];
  close: () => void;
  setLocked: (locked: boolean) => void;
}) {
  const fetcher = useFetcher<InviteResult>();
  const titleId = useId();
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const busy = fetcher.state !== "idle";
  // The dialog's dismissals (backdrop, Esc) hold while the invite posts; the
  // unmount cleanup releases the lock when the form remounts per open.
  useEffect(() => {
    setLocked(busy);
    return () => setLocked(false);
  }, [busy, setLocked]);
  // The send button says why it is off. Phone rules match the hint: 6 to 15
  // digits, numbers only.
  const nameMissing = name.trim() === "";
  const phoneShort = phone.length < 6;
  const ready = !nameMissing && !phoneShort;
  const whyNotReady = nameMissing
    ? "Please enter the employee's name before sending the invitation."
    : "Please enter a valid phone number with 6 to 15 digits.";
  const saved =
    fetcher.data?.kind === "invite" && fetcher.data.state === "done" ? fetcher.data : null;
  const error =
    fetcher.data?.kind === "invite" && fetcher.data.state === "error" ? fetcher.data.message : null;
  return (
    <>
      {saved ? (
        <div className={dialogStyles.dialogForm}>
          <h3 id={titleId} className={dialogStyles.dialogTitle}>
            Invite Employee
          </h3>
          <div className={styles.savedBlock} role="status">
            <p className={dialogStyles.savedMark}>Invitation Saved Successfully</p>
            <p className={dialogStyles.dialogHint}>
              {saved.employeeCode !== "" ? `Employee Code: ${saved.employeeCode}. ` : ""}
              {smsOutcome(saved.smsStatus)} The employee will appear in your team list below.
            </p>
          </div>
          <div className={dialogStyles.dialogActions}>
            <button type="button" className={dialogStyles.saveButton} onClick={close}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <fetcher.Form method="post" className={dialogStyles.dialogForm}>
          <input type="hidden" name="intent" value="invite" />
          <h3 id={titleId} className={dialogStyles.dialogTitle}>
            Invite Employee
          </h3>
          <p className={dialogStyles.dialogHint}>
            We will send an invitation to the employee's phone number by SMS. The employee will
            appear in your team list as "Invited" until they sign in.
          </p>
          <TextInput
            id={`${titleId}-name`}
            name="name"
            label="Employee Name"
            value={name}
            onChange={setName}
            autoComplete="off"
            maxLength={80}
          />
          <TextInput
            id={`${titleId}-phone`}
            name="phoneNumber"
            label="Phone Number"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(value) => setPhone(value.replace(/\D/g, ""))}
            autoComplete="off"
            maxLength={15}
            hint="Enter numbers only (6 to 15 digits)."
            prefix={
              <DialCodeSelect
                id={`${titleId}-dial`}
                name="countryCode"
                countries={countries}
                value={dialCode}
                onChange={setDialCode}
              />
            }
          />
          {error ? (
            <p className={dialogStyles.dialogError} role="alert">
              {error}
            </p>
          ) : null}
          {!busy && !ready ? <p className={dialogStyles.dialogHint}>{whyNotReady}</p> : null}
          <div className={dialogStyles.dialogActions}>
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
              disabled={busy || !ready}
              aria-busy={busy ? true : undefined}
            >
              {busy ? <Spinner size={13} /> : null}
              {busy ? "Sending…" : "Send Invitation"}
            </button>
          </div>
        </fetcher.Form>
      )}
    </>
  );
}
