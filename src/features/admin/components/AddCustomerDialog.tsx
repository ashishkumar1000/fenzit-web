import { useFetcher } from "react-router";
import { useId, useRef, useState } from "react";
import type { CustomerCreateResult } from "../adminBrowseLoaders";
import { DEFAULT_DIAL_CODE, type CountryCode } from "../../../services/countryCodes";
import { Spinner } from "../../../components/ui/Spinner";
import { TextInput } from "../../../components/ui/TextInput";
import { DialCodeSelect } from "../../../components/ui/DialCodeSelect";
import dialogStyles from "./JobSettingsDialog.module.css";
import styles from "./AddCustomerDialog.module.css";

/** The top bar's "Add customer" control. The dialog stays mounted so the
 *  click can always open it; the form inside remounts per open (the `key`),
 *  so a reopened dialog never shows the previous save's result. */
export function AddCustomerControl({ countries }: { countries: CountryCode[] | undefined }) {
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
        Add customer
      </button>
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-label="Add customer"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {openCount > 0 && countries !== undefined ? (
          <AddCustomerForm
            key={openCount}
            countries={countries}
            close={() => dialogRef.current?.close()}
          />
        ) : null}
      </dialog>
    </>
  );
}

/** The add-customer form inside the dialog: name and phone, address and city
 *  optional, then POST /customers through a fetcher, so the page's own action
 *  data stays untouched. The loader refetches after the action and the new
 *  row appears in the list. */
function AddCustomerForm({ countries, close }: { countries: CountryCode[]; close: () => void }) {
  const fetcher = useFetcher<CustomerCreateResult>();
  const titleId = useId();
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const busy = fetcher.state !== "idle";
  // The save button says why it is off. Phone rules match the hint: 6 to 15
  // digits, numbers only. Address and city are optional extras.
  const nameMissing = name.trim() === "";
  const phoneShort = phone.length < 6;
  const ready = !nameMissing && !phoneShort;
  const whyNotReady = nameMissing
    ? "Enter the customer's name to save them."
    : "Enter a phone number of 6 to 15 digits to save the customer.";
  const saved =
    fetcher.data?.kind === "create" && fetcher.data.state === "done" ? fetcher.data : null;
  const error =
    fetcher.data?.kind === "create" && fetcher.data.state === "error" ? fetcher.data.message : null;
  return (
    <>
      {saved ? (
        <div className={dialogStyles.dialogForm}>
          <h3 id={titleId} className={dialogStyles.dialogTitle}>
            Customer saved
          </h3>
          <div className={styles.savedBlock} role="status">
            <p className={dialogStyles.savedMark}>Customer saved.</p>
            {/* Only the code is promised: active bucket/search filters can
                hide a brand-new customer (0 jobs never shows under Repeat),
                so the message must not claim the list shows them. */}
            <p className={dialogStyles.dialogHint}>Their customer code is {saved.customerCode}.</p>
          </div>
          <div className={dialogStyles.dialogActions}>
            <button type="button" className={dialogStyles.saveButton} onClick={close}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <fetcher.Form method="post" className={dialogStyles.dialogForm}>
          <input type="hidden" name="intent" value="create" />
          <h3 id={titleId} className={dialogStyles.dialogTitle}>
            Add customer
          </h3>
          <p className={dialogStyles.dialogHint}>
            A phone number identifies a customer — one number per customer per company.
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
          <TextInput
            id={`${titleId}-address`}
            name="address"
            label="Address (optional)"
            value={address}
            onChange={setAddress}
            autoComplete="off"
            maxLength={200}
          />
          <TextInput
            id={`${titleId}-city`}
            name="city"
            label="City (optional)"
            value={city}
            onChange={setCity}
            autoComplete="off"
            maxLength={80}
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
              {busy ? "Saving…" : "Save customer"}
            </button>
          </div>
        </fetcher.Form>
      )}
    </>
  );
}
