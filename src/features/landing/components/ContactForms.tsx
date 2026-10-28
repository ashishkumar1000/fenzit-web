import { type ReactNode, Suspense, useState } from "react";
import { Await, useLoaderData } from "react-router";
import { DialCodeSelect } from "../../../components/ui/DialCodeSelect";
import {
  type CountryCode,
  type CountryCodesData,
  DEFAULT_DIAL_CODE,
  FALLBACK_COUNTRY_CODES,
} from "../../../services/countryCodes";
import { EMAIL_MAX_LENGTH } from "../../../utils/contactValidation";
import type { ContactRequestResult } from "../contactRequestAction";
import { useContactSubmission } from "../useContactSubmission";
import styles from "./ContactForms.module.css";

type ErrorField = Extract<ContactRequestResult, { ok: false }>["field"];

// A stable function, so React calls it once when the note appears and not on every render.
const focusOnMount = (node: HTMLParagraphElement | null) => node?.focus();

/** The thank-you line. It takes focus, so a screen reader hears it after the form goes away. */
function SuccessNote({ message }: { message: string }) {
  return (
    <p ref={focusOnMount} className={styles.done} role="status" tabIndex={-1}>
      {message}
    </p>
  );
}

/**
 * The phone and email fields shared by the call-back and demo forms. The visitor
 * gives one or both. The country list loads from the route's loader; until it
 * arrives the India-only fallback shows, in the same markup, so nothing jumps.
 */
function ContactFields({
  errorField,
  submit,
}: {
  errorField: ErrorField;
  /** When given, the submit button sits on the same row as the two fields on wide screens. */
  submit?: ReactNode;
}) {
  const { countryCodes } = useLoaderData() as CountryCodesData;
  const [dialCode, setDialCode] = useState<string>(DEFAULT_DIAL_CODE);
  const contactError = errorField === "contact";

  const renderDialField = (countries: CountryCode[]) => (
    <DialCodeSelect
      id="contact-dial"
      name="dialCode"
      countries={countries}
      value={dialCode}
      onChange={setDialCode}
      compact
    />
  );

  return (
    <fieldset className={styles.contact}>
      <legend className={styles.legend}>How can we reach you?</legend>
      <p className={styles.hint}>Give a phone number, an email address, or both.</p>
      <div className={submit ? styles.fieldsRow : undefined}>
        <div className={styles.field}>
          <label htmlFor="contact-phone" className={styles.label}>
            Phone number
          </label>
          <div
            className={
              errorField === "phone" || contactError
                ? `${styles.phoneBox} ${styles.invalid}`
                : styles.phoneBox
            }
          >
            <Suspense fallback={renderDialField(FALLBACK_COUNTRY_CODES)}>
              <Await resolve={countryCodes}>{renderDialField}</Await>
            </Suspense>
            <input
              id="contact-phone"
              type="tel"
              name="phone"
              className={styles.numberInput}
              inputMode="tel"
              autoComplete="tel-national"
              aria-invalid={errorField === "phone" || contactError}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="contact-email" className={styles.label}>
            Email address
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            className={
              errorField === "email" || contactError
                ? `${styles.input} ${styles.invalid}`
                : styles.input
            }
            autoComplete="email"
            maxLength={EMAIL_MAX_LENGTH}
            aria-invalid={errorField === "email" || contactError}
          />
        </div>
        {submit}
      </div>
    </fieldset>
  );
}

/** Asks for a call back. Posts to the home route, which routes it by the hidden intent field. */
export function CallBackForm() {
  const { fetcher, submitting, successMessage, errorText, errorField, onEdit, onSubmit } =
    useContactSubmission();

  if (successMessage !== undefined) {
    return <SuccessNote message={successMessage} />;
  }

  return (
    <fetcher.Form
      method="post"
      className={`${styles.form} ${styles.callBackForm}`}
      noValidate
      onChange={onEdit}
      onSubmit={onSubmit}
    >
      <input type="hidden" name="intent" value="call-back" />
      <ContactFields
        errorField={errorField}
        submit={
          <button
            type="submit"
            className={styles.submit}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? "Sending…" : "Request a call back"}
          </button>
        }
      />
      <p className={styles.status} role="alert">
        {errorText}
      </p>
    </fetcher.Form>
  );
}

/** Asks for a demo. Posts to /book-demo, which saves it as a demo request. */
export function DemoRequestForm() {
  const { fetcher, submitting, successMessage, errorText, errorField, onEdit, onSubmit } =
    useContactSubmission();

  if (successMessage !== undefined) {
    return <SuccessNote message={successMessage} />;
  }

  return (
    <fetcher.Form
      method="post"
      className={styles.form}
      noValidate
      onChange={onEdit}
      onSubmit={onSubmit}
    >
      <div className={styles.field}>
        <label htmlFor="demo-name" className={styles.label}>
          Your name
        </label>
        <input
          id="demo-name"
          type="text"
          name="name"
          className={errorField === "name" ? `${styles.input} ${styles.invalid}` : styles.input}
          autoComplete="name"
          maxLength={120}
          aria-invalid={errorField === "name"}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="demo-company" className={styles.label}>
          Company name <span className={styles.optional}>(optional)</span>
        </label>
        <input
          id="demo-company"
          type="text"
          name="company"
          className={errorField === "company" ? `${styles.input} ${styles.invalid}` : styles.input}
          aria-invalid={errorField === "company"}
          autoComplete="organization"
          maxLength={120}
        />
      </div>
      <ContactFields errorField={errorField} />
      <div className={styles.field}>
        <label htmlFor="demo-note" className={styles.label}>
          Anything we should know? <span className={styles.optional}>(optional)</span>
        </label>
        <textarea id="demo-note" name="note" className={styles.textarea} rows={4} maxLength={500} />
      </div>
      <button type="submit" className={styles.submit} disabled={submitting} aria-busy={submitting}>
        {submitting ? "Sending…" : "Book a demo"}
      </button>
      <p className={styles.status} role="alert">
        {errorText}
      </p>
    </fetcher.Form>
  );
}
