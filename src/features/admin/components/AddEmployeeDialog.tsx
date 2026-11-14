import { useFetcher } from "react-router";
import { useId, useRef, useState } from "react";
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
        Invite employee
      </button>
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-label="Invite employee"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {openCount > 0 && countries !== undefined ? (
          <AddEmployeeForm
            key={openCount}
            countries={countries}
            close={() => dialogRef.current?.close()}
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
function AddEmployeeForm({ countries, close }: { countries: CountryCode[]; close: () => void }) {
  const fetcher = useFetcher<InviteResult>();
  const titleId = useId();
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const busy = fetcher.state !== "idle";
  // The send button says why it is off. Phone rules match the hint: 6 to 15
  // digits, numbers only.
  const nameMissing = name.trim() === "";
  const phoneShort = phone.length < 6;
  const ready = !nameMissing && !phoneShort;
  const whyNotReady = nameMissing
    ? "Enter the employee's name to send the invite."
    : "Enter a phone number of 6 to 15 digits to send the invite.";
  const saved =
    fetcher.data?.kind === "invite" && fetcher.data.state === "done" ? fetcher.data : null;
  const error =
    fetcher.data?.kind === "invite" && fetcher.data.state === "error" ? fetcher.data.message : null;
  return (
    <>
      {saved ? (
        <div className={dialogStyles.dialogForm}>
          <h3 id={titleId} className={dialogStyles.dialogTitle}>
            Invite employee
          </h3>
          <div className={styles.savedBlock} role="status">
            <p className={dialogStyles.savedMark}>Invite saved.</p>
            <p className={dialogStyles.dialogHint}>
              {saved.employeeCode !== "" ? `Their employee code is ${saved.employeeCode}. ` : ""}
              {smsOutcome(saved.smsStatus)} They appear in the team list below.
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
            Invite employee
          </h3>
          <p className={dialogStyles.dialogHint}>
            We'll send an invite SMS to their phone. They appear in the team list as Invited until
            they sign in.
          </p>
          <TextInput
            id={`${titleId}-name`}
            name="name"
            label="Name"
            value={name}
            onChange={setName}
            autoComplete="off"
            maxLength={80}
          />
          <TextInput
            id={`${titleId}-phone`}
            name="phoneNumber"
            label="Phone number"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(value) => setPhone(value.replace(/\D/g, ""))}
            autoComplete="off"
            maxLength={15}
            hint="Numbers only, 6 to 15 digits."
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
            <button type="button" className={dialogStyles.quietButton} onClick={close}>
              Cancel
            </button>
            <button type="submit" className={dialogStyles.saveButton} disabled={busy || !ready}>
              {busy ? <Spinner size={13} /> : null}
              {busy ? "Sending…" : "Send invite"}
            </button>
          </div>
        </fetcher.Form>
      )}
    </>
  );
}
