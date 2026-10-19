import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { ArrowRight, BellRing, CircleCheck, Lock, Mail } from "lucide-react";
import { EMAIL_MAX_LENGTH } from "../../../utils/contactValidation";
import { type CountryCodesData, DEFAULT_DIAL_CODE } from "../countryCodes";
import type { EarlyAccessResult } from "../earlyAccessAction";
import { CountryFlag } from "./CountryFlag";
import styles from "./NotifyForm.module.css";

/** The early-access sign-up form. It posts to the home route's action, which calls fenzit-be. */
export function NotifyForm() {
  const fetcher = useFetcher<EarlyAccessResult>();
  const { countryCodes } = useLoaderData() as CountryCodesData;
  const result = fetcher.data;
  const submitting = fetcher.state !== "idle";
  // An error belongs to the input it was shown for. Editing a field clears it until the next submit.
  const [editedSinceSubmit, setEditedSinceSubmit] = useState(false);
  const [dialCode, setDialCode] = useState<string>(DEFAULT_DIAL_CODE);
  const selectedCountry = countryCodes.find((country) => country.dialCode === dialCode);

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
        <div className={styles.field}>
          <label htmlFor="notify-email" className={styles.label}>
            Email address
          </label>
          <span className={styles.inputWrap}>
            <Mail className={styles.inputIcon} aria-hidden="true" focusable="false" />
            <input
              id="notify-email"
              type="email"
              name="email"
              className={`${styles.input} ${styles.inputWithIcon}`}
              placeholder="you@company.com"
              required
              maxLength={EMAIL_MAX_LENGTH}
              autoComplete="email"
              aria-invalid={errorField === "email"}
              aria-describedby="notify-email-hint notify-status"
            />
          </span>
          <span id="notify-email-hint" className={styles.hint}>
            We will email you when access opens.
          </span>
        </div>
        <div className={styles.field}>
          <span className={styles.labelRow}>
            <span className={styles.label}>Phone number</span>
            <span className={styles.optional}>Optional</span>
          </span>
          <div className={styles.phoneRow}>
            <label className={styles.dialField}>
              <span className={styles.visuallyHidden}>Country code</span>
              <span className={styles.selectWrap}>
                <CountryFlag iso2={selectedCountry?.iso2} />
                <select
                  name="dialCode"
                  className={`${styles.input} ${styles.selectWithFlag}`}
                  value={dialCode}
                  onChange={(event) => setDialCode(event.target.value)}
                >
                  {countryCodes.map((country) => (
                    <option key={`${country.iso2}-${country.dialCode}`} value={country.dialCode}>
                      {`${country.countryName} (${country.dialCode})`}
                    </option>
                  ))}
                </select>
              </span>
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
          <span className={styles.hint}>Add it with the country code you pick.</span>
        </div>
      </div>
      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submit}
          disabled={submitting}
          aria-busy={submitting}
        >
          <BellRing className={styles.icon} aria-hidden="true" focusable="false" />
          {submitting ? "Joining…" : "Join early access"}
          {submitting ? null : (
            <ArrowRight className={styles.icon} aria-hidden="true" focusable="false" />
          )}
        </button>
        <p
          id="notify-status"
          className={errorText ? `${styles.status} ${styles.noteInvalid}` : styles.status}
          role="status"
        >
          {errorText ? null : (
            <Lock className={styles.statusIcon} aria-hidden="true" focusable="false" />
          )}
          {errorText ?? "We'll only email you about early access. No spam."}
        </p>
      </div>
    </fetcher.Form>
  );
}
