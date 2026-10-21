import { useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "../../../components/ui/Button";
import { TextInput } from "../../../components/ui/TextInput";
import type { LoginActionResult, LoginError } from "../loginAction";
import styles from "./LoginForm.module.css";

/** Returns the message for one field, or undefined when the error is for another field. */
function errorFor(error: LoginError | undefined, field: LoginError["field"]): string | undefined {
  return error?.field === field ? error.message : undefined;
}

/**
 * The login form. One field takes a phone number or an email. An email shows a
 * password field and logs in at once. A phone number gets a 4-digit code first,
 * and this form shows the code step until the owner logs in or changes number.
 */
export function LoginForm() {
  const fetcher = useFetcher<LoginActionResult>();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const busy = fetcher.state !== "idle";
  const result = fetcher.data;
  // An "@" anywhere means the email path, so the password field appears as the owner types the address.
  const isEmail = identifier.includes("@");

  if (result?.step === "code") {
    const error = result.error;
    return (
      <div className={styles.form}>
        <p className={styles.codeIntro}>Enter the 4-digit code we sent to {result.phoneLabel}.</p>
        <fetcher.Form method="post" className={styles.form} noValidate>
          <input type="hidden" name="intent" value="verify-code" />
          <input type="hidden" name="otpSessionId" value={result.otpSessionId} />
          <input type="hidden" name="phoneLabel" value={result.phoneLabel} />
          <TextInput
            id="login-code"
            name="otpCode"
            label="4-digit code"
            value={code}
            onChange={setCode}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            error={error?.field === "code" ? error.message : undefined}
            disabled={busy}
          />
          {error?.field === "form" ? (
            <p className={styles.formError} role="alert">
              {error.message}
            </p>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </Button>
        </fetcher.Form>
        <div className={styles.secondaryActions}>
          <fetcher.Form method="post" noValidate>
            <input type="hidden" name="identifier" value={identifier} />
            <Button type="submit" variant="secondary" disabled={busy}>
              Send new code
            </Button>
          </fetcher.Form>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setCode("");
              fetcher.reset();
            }}
          >
            Change number
          </Button>
        </div>
      </div>
    );
  }

  const error = result?.error;
  return (
    <fetcher.Form method="post" className={styles.form} noValidate>
      <TextInput
        id="login-identifier"
        name="identifier"
        label="Phone or email"
        value={identifier}
        onChange={setIdentifier}
        inputMode="text"
        autoComplete="username"
        hint="Use the phone number or the email linked to your account."
        error={errorFor(error, "identifier")}
        disabled={busy}
      />
      {isEmail ? (
        <TextInput
          id="login-password"
          name="password"
          type="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={errorFor(error, "password")}
          disabled={busy}
        />
      ) : null}
      {error?.field === "form" ? (
        <p className={styles.formError} role="alert">
          {error.message}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? (isEmail ? "Logging in…" : "Sending code…") : isEmail ? "Log in" : "Send code"}
      </Button>
    </fetcher.Form>
  );
}
