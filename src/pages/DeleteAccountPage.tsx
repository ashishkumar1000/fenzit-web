import { Form, Link, useActionData, useNavigation } from "react-router";
import type { deleteAccountAction } from "../features/account-deletion/deletionAction";
import { DELETE_ACCOUNT_PAGE } from "../app/pageMeta";
import { CONTACT_EMAIL } from "../config/contact";
import { SimplePage, SimpleSection } from "./SimplePage";
import styles from "./DeleteAccountPage.module.css";

/** Shown after a request is received. The server still sends its own shorter message (account-deletion.service.ts); the page does not read it, so this copy is the one users see. */
const RECEIVED_PARAGRAPHS = [
  "Thanks. We have received your request to delete your Fenzit account.",
  "Our team will review it and follow the rules for your role on this page.",
  "Records we must keep for audit stay, with names removed.",
  `If you did not send this request, or you need to change it, email ${CONTACT_EMAIL}.`,
];

/**
 * Public page where a person asks for their Fenzit account to be deleted.
 * Step one takes a mobile number; step two checks a code sent to it. Nothing
 * is deleted here: the request goes to the Fenzit team for review.
 */
export function DeleteAccountPage() {
  const result = useActionData<typeof deleteAccountAction>();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  const sendingCode = busy && navigation.formData?.get("intent") !== "submit-code";

  return (
    <SimplePage
      meta={DELETE_ACCOUNT_PAGE}
      id="delete-account-title"
      title="Delete your Fenzit account"
      lead="Ask us to delete your Fenzit account and the personal details linked to it. Enter the mobile number you sign in with. We send a code to that number to check it is yours."
    >
      <SimpleSection
        id="what-happens"
        title="What happens next"
        paragraphs={[
          "Our team reviews every request by hand. Sending a request does not remove anything by itself.",
          "If you send a second request while one is open, we keep the first one.",
        ]}
      />
      <SimpleSection
        id="technician-rule"
        title="If you are a technician"
        paragraphs={[
          "Your personal details will be deleted: your name, mobile number and sign-in details. The owner of your company will be told that you have been removed.",
        ]}
      />
      <SimpleSection
        id="owner-rule"
        title="If you own a company"
        paragraphs={[
          "All of your company's data will be deleted, including its jobs, photos, attendance and team records. Technicians who work only for your company will be deleted with it.",
        ]}
      />
      <SimpleSection
        id="what-we-keep"
        title="What we keep"
        paragraphs={["Records we must keep for audit stay, with names removed."]}
      />

      <SimpleSection id="send-request" title="Send your request">
        {result?.step === "done" ? (
          <div className={styles.received} role="status">
            {RECEIVED_PARAGRAPHS.map((text) => (
              <p key={text} className={styles.receivedText}>
                {text}
              </p>
            ))}
          </div>
        ) : null}

        {result?.step !== "done" && result?.step !== "code" ? (
          <Form method="post" className={styles.form}>
            <input type="hidden" name="intent" value="send-code" />
            <label className={styles.label} htmlFor="phone">
              Mobile number (+91)
            </label>
            <div className={styles.phoneRow}>
              <span className={styles.dial} aria-hidden="true">
                +91
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                className={styles.input}
                placeholder="98765 43210"
                required
                aria-invalid={result?.error ? true : undefined}
                aria-describedby={result?.error ? "phone-error" : "phone-hint"}
              />
            </div>
            <p id="phone-hint" className={styles.hint}>
              Use the number you sign in with. Only Indian mobile numbers can be used.
            </p>
            {result?.error ? (
              <p id="phone-error" className={styles.error} role="alert">
                {result.error}
              </p>
            ) : null}
            <button type="submit" className={styles.primary} disabled={busy}>
              {sendingCode ? "Sending code…" : "Send code"}
            </button>
          </Form>
        ) : null}

        {result?.step === "code" ? (
          <Form method="post" className={styles.form}>
            <input type="hidden" name="intent" value="submit-code" />
            <input type="hidden" name="otpSessionId" value={result.otpSessionId} />
            <input type="hidden" name="phoneLabel" value={result.phoneLabel} />
            <p className={styles.hint}>
              We sent a 4-digit code to {result.phoneLabel}. The code is valid for a short time.
            </p>
            <div className={styles.warning} role="note">
              <p className={styles.warningTitle}>Before you send this</p>
              <p className={styles.warningText}>
                Once deletion is done, it cannot be undone. If you own a company, all of the
                company's data will be deleted.
              </p>
            </div>
            <label className={styles.checkRow}>
              <input type="checkbox" name="confirm" value="yes" required className={styles.check} />
              <span>I understand that approved deletion cannot be undone.</span>
            </label>
            <label className={styles.label} htmlFor="otpCode">
              Code
            </label>
            <input
              id="otpCode"
              name="otpCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={styles.input}
              maxLength={4}
              required
              aria-invalid={result.error ? true : undefined}
              aria-describedby={result.error ? "code-error" : undefined}
            />
            {result.error ? (
              <p id="code-error" className={styles.error} role="alert">
                {result.error}
              </p>
            ) : null}
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "Sending request…" : "Send deletion request"}
            </button>
            <Link className={styles.quiet} to="/delete-account">
              Use a different number
            </Link>
          </Form>
        ) : null}
      </SimpleSection>
    </SimplePage>
  );
}
