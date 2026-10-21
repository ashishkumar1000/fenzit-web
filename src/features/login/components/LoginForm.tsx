import { useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "../../../components/ui/Button";
import { DialCodeSelect } from "../../../components/ui/DialCodeSelect";
import { TextInput } from "../../../components/ui/TextInput";
import { EMAIL_MAX_LENGTH } from "../../../utils/contactValidation";
import type { LoginActionResult, LoginError } from "../loginAction";
import { classifyIdentifier, LOGIN_COUNTRY_CODES, LOGIN_DIAL_CODE } from "../loginInput";
import styles from "./LoginForm.module.css";

/** Returns the message for one field, or undefined when the error is for another field. */
function errorFor(error: LoginError | undefined, field: LoginError["field"]): string | undefined {
  return error?.field === field ? error.message : undefined;
}

/**
 * The login form. One field takes a phone number or an email. A phone number shows a country
 * code choice beside it. An email shows a password field. A phone number gets a 4-digit code
 * first, and this form shows the code step until the owner logs in or changes number.
 */
export function LoginForm() {
  const fetcher = useFetcher<LoginActionResult>();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [dialCode, setDialCode] = useState<string>(LOGIN_DIAL_CODE);

  const busy = fetcher.state !== "idle";
  const result = fetcher.data;

  // Until the value is recognised, nothing below the field shows. An "@" means email. A value
  // that starts with a digit or "+" is a phone number, and it gets the country code choice.
  const parsed = classifyIdentifier(identifier);
  const isEmail = identifier.includes("@");
  const phoneLike = !isEmail && /^[(+\d]/.test(identifier.trim());
  const digitCount = identifier.replace(/\D/g, "").length;
  // A problem is shown only once the input is long enough to be judged, so typing does not nag.
  const emailProblem = isEmail && parsed.kind === "invalid" ? parsed.message : undefined;
  const phoneProblem =
    phoneLike && parsed.kind === "invalid" && digitCount >= 10 ? parsed.message : undefined;
  // The button is enabled once the input is complete: a recognised phone number, or an email with a password.
  const ready = parsed.kind === "phone" || (parsed.kind === "email" && password.trim() !== "");
  // A disabled button says what is missing. Problems with the typed value are shown by their field.
  const notReadyReason =
    identifier.trim() === "" || ready || emailProblem || phoneProblem
      ? undefined
      : isEmail
        ? "Enter your password."
        : phoneLike
          ? "Enter all 10 digits of the mobile number."
          : undefined;

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
            {busy ? "Logging in…" : "Login"}
          </Button>
        </fetcher.Form>
        <div className={styles.secondaryActions}>
          <fetcher.Form method="post" noValidate>
            <input type="hidden" name="identifier" value={identifier} />
            <input type="hidden" name="dialCode" value={dialCode} />
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
        maxLength={EMAIL_MAX_LENGTH}
        placeholder="e.g. mona@gmail.com or 98765 43210"
        prefix={
          phoneLike ? (
            <DialCodeSelect
              id="login-dial"
              name="dialCode"
              countries={LOGIN_COUNTRY_CODES}
              value={dialCode}
              onChange={setDialCode}
              disabled={busy}
            />
          ) : undefined
        }
        hint="Use the phone number or the email linked to your account."
        error={errorFor(error, "identifier") ?? emailProblem ?? phoneProblem}
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
      <Button type="submit" disabled={busy || !ready}>
        {busy ? "Logging in…" : "Login"}
      </Button>
      {notReadyReason ? <p className={styles.notReadyReason}>{notReadyReason}</p> : null}
    </fetcher.Form>
  );
}
