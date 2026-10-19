import { useState, type FormEvent } from "react";
import { BellRing, CircleCheck } from "lucide-react";
import styles from "./NotifyForm.module.css";

// One @, no spaces. Dots may separate labels but never start, end, or double up,
// so "a@b..c" and ".a@b.com" are rejected. RFC 5321 caps an address at 254 characters.
const EMAIL_PATTERN = /^[^\s@.]+(\.[^\s@.]+)*@[^\s@.]+(\.[^\s@.]+)+$/;
const EMAIL_MAX_LENGTH = 254;

type Status = "idle" | "invalid" | "subscribed";

export function NotifyForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [submittedEmail, setSubmittedEmail] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();

    // maxLength only limits typing in a browser. Pasted or scripted input needs this check too.
    if (value.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(value)) {
      setStatus("invalid");
      return;
    }

    // TODO: wire this up to your email list / backend (Mailchimp, Formspree, etc.)
    setSubmittedEmail(value);
    setStatus("subscribed");
  }

  if (status === "subscribed") {
    return (
      <>
        <p className={styles.confirm}>
          <CircleCheck className={styles.confirmIcon} aria-hidden="true" focusable="false" />
          You're on the list — we'll be in touch soon.
        </p>
        <p className={styles.note}>Thanks! We'll email {submittedEmail} at launch.</p>
      </>
    );
  }

  return (
    <>
      <form id="notify" className={styles.form} noValidate onSubmit={handleSubmit}>
        <input
          type="email"
          id="email"
          className={styles.email}
          placeholder="you@company.com"
          aria-label="Email address"
          aria-invalid={status === "invalid"}
          required
          maxLength={EMAIL_MAX_LENGTH}
          autoComplete="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "invalid") setStatus("idle");
          }}
        />
        <button type="submit" className={styles.submit}>
          <BellRing className={styles.icon} aria-hidden="true" focusable="false" />
          Notify me
        </button>
      </form>
      <p
        className={status === "invalid" ? `${styles.note} ${styles.noteInvalid}` : styles.note}
        role="status"
      >
        {status === "invalid"
          ? "Please enter a valid email address."
          : "Be the first to know when we launch. No spam, ever."}
      </p>
    </>
  );
}
