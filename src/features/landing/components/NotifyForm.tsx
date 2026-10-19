import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { BellRing, CircleCheck } from "lucide-react";
import { EMAIL_MAX_LENGTH } from "../../../utils/contactValidation";
import { type CountryCodesData, DEFAULT_DIAL_CODE } from "../countryCodes";
import type { EarlyAccessResult } from "../earlyAccessAction";
import styles from "./NotifyForm.module.css";

/** The early-access sign-up form. It posts to the home route's action, which calls fenzit-be. */
export function NotifyForm() {
  const fetcher = useFetcher<EarlyAccessResult>();
  const { countryCodes } = useLoaderData() as CountryCodesData;
  const result = fetcher.data;
  const submitting = fetcher.state !== "idle";
  // An error belongs to the input it was shown for. Editing a field clears it until the next submit.
  const [editedSinceSubmit, setEditedSinceSubmit] = useState(false);

  if (result?.ok) {
    return (
      <div className={styles.greeting} role="status">
        <p className={styles.greetingTitle}>
          <CircleCheck className={styles.confirmIcon} aria-hidden="true" focusable="false" />
          Welcome to Fenzit. You're on the list.
        </p>
        <p className={styles.reference}>
          Your reference number is{" "}
          <strong className={styles.referenceNumber}>{result.reference}</strong>. Keep it for your
          records.
        </p>
        <p className={styles.note}>We'll email {result.email} when access opens.</p>
      </div>
    );
  }

  const showError =
    fetcher.state === "idle" && result !== undefined && !result.ok && !editedSinceSubmit;
  const errorField = showError && !result.ok ? result.field : undefined;
  const errorText = showError && !result.ok ? result.error : undefined;

  return (
    <fetcher.Form
      id="notify"
      method="post"
      className={styles.form}
      noValidate
      onChange={() => setEditedSinceSubmit(true)}
      onSubmit={() => setEditedSinceSubmit(false)}
    >
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Email address</span>
          <input
            type="email"
            name="email"
            className={styles.input}
            placeholder="you@company.com"
            required
            maxLength={EMAIL_MAX_LENGTH}
            autoComplete="email"
            aria-invalid={errorField === "email"}
            aria-describedby="notify-status"
          />
        </label>
        <div className={styles.field}>
          <span className={styles.label}>Phone number (optional)</span>
          <div className={styles.phoneRow}>
            <label className={styles.dialField}>
              <span className={styles.visuallyHidden}>Country code</span>
              <select name="dialCode" className={styles.input} defaultValue={DEFAULT_DIAL_CODE}>
                {countryCodes.map((country) => (
                  <option key={`${country.iso2}-${country.dialCode}`} value={country.dialCode}>
                    {`${country.countryName} (${country.dialCode})`}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.numberField}>
              <span className={styles.visuallyHidden}>Phone number without country code</span>
              <input
                type="tel"
                name="phone"
                className={styles.input}
                placeholder="Phone number"
                inputMode="tel"
                autoComplete="tel-national"
                aria-invalid={errorField === "phone"}
                aria-describedby="notify-status"
              />
            </label>
          </div>
        </div>
      </div>
      <button type="submit" className={styles.submit} disabled={submitting} aria-busy={submitting}>
        <BellRing className={styles.icon} aria-hidden="true" focusable="false" />
        {submitting ? "Joining…" : "Join early access"}
      </button>
      <p
        id="notify-status"
        className={errorText ? `${styles.note} ${styles.noteInvalid}` : styles.note}
        role="status"
      >
        {errorText ?? "We'll only email you about early access. No spam."}
      </p>
    </fetcher.Form>
  );
}
