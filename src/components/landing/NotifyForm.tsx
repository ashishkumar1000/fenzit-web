import { useState, type FormEvent } from "react";

// Same rule as the original page: one @, no spaces, a dot after it.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "invalid" | "subscribed";

export function NotifyForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [submittedEmail, setSubmittedEmail] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();

    if (!EMAIL_PATTERN.test(value)) {
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
        <p className="ok" style={{ fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ width: 18, height: 18 }}>
            <path d="M21.801 10A10 10 0 1 1 17 3.335" />
            <path d="m9 11 3 3L22 4" />
          </svg>
          You're on the list — we'll be in touch soon.
        </p>
        <p className="note">Thanks! We'll email {submittedEmail} at launch.</p>
      </>
    );
  }

  return (
    <>
      <form id="notify" noValidate onSubmit={handleSubmit}>
        <input
          type="email"
          id="email"
          placeholder="you@company.com"
          aria-label="Email address"
          aria-invalid={status === "invalid"}
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "invalid") setStatus("idle");
          }}
        />
        <button type="submit">
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M10.268 21a2 2 0 0 0 3.464 0" />
            <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
          </svg>
          Notify me
        </button>
      </form>
      <p
        className="note"
        role="status"
        style={status === "invalid" ? { color: "#c9372c" } : undefined}
      >
        {status === "invalid"
          ? "Please enter a valid email address."
          : "Be the first to know when we launch. No spam, ever."}
      </p>
    </>
  );
}
