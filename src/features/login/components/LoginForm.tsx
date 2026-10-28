import { useState } from "react";
import { useFetcher } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { DialCodeSelect } from "../../../components/ui/DialCodeSelect";
import { TextInput } from "../../../components/ui/TextInput";
import { EMAIL_MAX_LENGTH } from "../../../utils/contactValidation";
import type { LoginActionResult, LoginError } from "../loginAction";
import {
  classifyIdentifier,
  INDIA_ONLY_MESSAGE,
  LOGIN_COUNTRY_CODES,
  LOGIN_DIAL_CODE,
} from "../loginInput";
import styles from "./LoginForm.module.css";

const NOT_READY_ID = "login-not-ready";

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
  // The password is hidden until the owner asks to see it.
  const [showPassword, setShowPassword] = useState(false);
  const [dialCode, setDialCode] = useState<string>(LOGIN_DIAL_CODE);
  // The value the last submit was sent for. A result from that submit shows only while the field still holds it.
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);

  const busy = fetcher.state !== "idle";
  const result = fetcher.data;
  const trimmed = identifier.trim();
  // The same cleaning classifyIdentifier applies, so "+ 91" is read as "+91".
  const compact = trimmed.replace(/[\s\-().]/g, "");
  const parsed = classifyIdentifier(identifier);
  const isEmail = identifier.includes("@");
  const phoneLike = !isEmail && /^[(+\d]/.test(trimmed);
  // The country choice shows for a number. It hides once the typed value starts with +91, so the code is not shown twice.
  const showDialCode = phoneLike && !compact.startsWith(LOGIN_DIAL_CODE);
  const digitCount = identifier.replace(/\D/g, "").length;
  // An email problem shows once the domain has a dot, so typing "a@" does not nag.
  const emailProblem =
    isEmail && parsed.kind === "invalid" && /@[^@]*\./.test(identifier)
      ? parsed.message
      : undefined;
  // A phone problem shows once the input has 10 digits, so a number still being typed is not judged.
  const phoneProblem =
    phoneLike && parsed.kind === "invalid" && digitCount >= 10 ? parsed.message : undefined;
  const ready = parsed.kind === "phone" || (parsed.kind === "email" && password.trim() !== "");

  // A disabled button says what is missing. A problem with the typed value is shown by its field instead.
  const notReadyReason = (): string | undefined => {
    if (trimmed === "" || ready || emailProblem || phoneProblem) return undefined;
    if (isEmail) {
      return parsed.kind === "invalid" ? "Enter a valid email address." : "Enter your password.";
    }
    if (phoneLike) {
      return compact.startsWith("+") && !compact.startsWith(LOGIN_DIAL_CODE)
        ? INDIA_ONLY_MESSAGE
        : "Enter all 10 digits of the mobile number.";
    }
    return "Enter your phone number or email.";
  };
  const reason = notReadyReason();

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

  const error = submittedFor === identifier ? result?.error : undefined;
  return (
    <fetcher.Form
      method="post"
      className={styles.form}
      noValidate
      onSubmit={() => setSubmittedFor(identifier)}
    >
      <TextInput
        id="login-identifier"
        name="identifier"
        label="Phone or email"
        value={identifier}
        onChange={setIdentifier}
        inputMode="text"
        autoComplete="username"
        maxLength={EMAIL_MAX_LENGTH}
        placeholder="Phone or email"
        prefix={
          showDialCode ? (
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
          type={showPassword ? "text" : "password"}
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={errorFor(error, "password")}
          disabled={busy}
          trailing={
            <button
              type="button"
              className={styles.passwordToggle}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((shown) => !shown)}
              disabled={busy}
            >
              {showPassword ? (
                <EyeOff size={20} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Eye size={20} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          }
        />
      ) : null}
      {error?.field === "form" ? (
        <p className={styles.formError} role="alert">
          {error.message}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={busy || !ready}
        describedBy={reason ? NOT_READY_ID : undefined}
      >
        {busy ? "Logging in…" : "Login"}
      </Button>
      {reason ? (
        <p id={NOT_READY_ID} className={styles.notReadyReason}>
          {reason}
        </p>
      ) : null}
    </fetcher.Form>
  );
}
