import { redirect, type ActionFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { messageForError } from "../../utils/errorMessages";
import { emailLogin, sendOtp, verifyOtp, type LoginResponse } from "./loginApi";
import { classifyIdentifier, formatPhoneLabel } from "./loginInput";
import { writeSession } from "../../services/session";

export type LoginField = "identifier" | "password" | "code" | "form";

export type LoginError = { field: LoginField; message: string };

/**
 * What the login form shows next. "sign-in" is the first step. "code" is the
 * phone step, after a code was sent. A successful sign-in does not return a
 * result: the action redirects to /admin.
 */
export type LoginActionResult =
  | { step: "sign-in"; error?: LoginError }
  | { step: "code"; otpSessionId: string; phoneLabel: string; error?: LoginError };

const WRONG_EMAIL_OR_PASSWORD = "That email and password do not match. Check them and try again.";
const SAVE_FAILED = "We could not save your sign-in. Turn off private browsing and try again.";
const CODE_FORMAT = "Enter the 4-digit code we sent you.";

/**
 * Route action for /login. The page posts the typed value and, for email, the
 * password. The value decides the path: "@" means email, anything else is a
 * phone number that gets a code. A second post with the code finishes a phone
 * sign-in. Every outcome is either a step to show or a redirect to /admin.
 */
export async function loginAction({
  request,
}: ActionFunctionArgs): Promise<LoginActionResult | Response> {
  const form = await request.formData();
  if (String(form.get("intent") ?? "") === "verify-code") {
    return verifyCode(form);
  }
  return signIn(form);
}

async function signIn(form: FormData): Promise<LoginActionResult | Response> {
  const identifier = classifyIdentifier(String(form.get("identifier") ?? ""));

  if (identifier.kind === "empty") {
    return signInError({ field: "identifier", message: "Enter your phone number or email." });
  }
  if (identifier.kind === "invalid") {
    return signInError({ field: "identifier", message: identifier.message });
  }

  if (identifier.kind === "email") {
    const password = String(form.get("password") ?? "");
    if (password === "") {
      return signInError({ field: "password", message: "Enter your password." });
    }
    return emailSignIn(identifier.email, password);
  }

  try {
    const sent = await sendOtp(identifier.phoneNumber);
    return { step: "code", otpSessionId: sent.otp_session_id, phoneLabel: identifier.label };
  } catch (error) {
    return signInError({ field: "identifier", message: messageForError(error) });
  }
}

async function emailSignIn(email: string, password: string): Promise<LoginActionResult | Response> {
  try {
    return finishSignIn(await emailLogin(email, password), signInError);
  } catch (error) {
    // 401 covers an unknown email, a wrong password and a disabled account. It is one answer on purpose.
    if (error instanceof ApiError && error.status === 401) {
      return signInError({ field: "password", message: WRONG_EMAIL_OR_PASSWORD });
    }
    // A connection or server failure is about the whole form, not the password.
    return signInError({ field: "form", message: messageForError(error) });
  }
}

async function verifyCode(form: FormData): Promise<LoginActionResult | Response> {
  const otpSessionId = String(form.get("otpSessionId") ?? "");
  const phoneLabel = String(form.get("phoneLabel") ?? formatPhoneLabel(""));
  const code = String(form.get("otpCode") ?? "").trim();
  const codeStep = (error?: LoginError): LoginActionResult => ({
    step: "code",
    otpSessionId,
    phoneLabel,
    ...(error ? { error } : {}),
  });

  if (!/^\d{4}$/.test(code)) {
    return codeStep({ field: "code", message: CODE_FORMAT });
  }

  try {
    return finishSignIn(await verifyOtp(otpSessionId, code), codeStep);
  } catch (error) {
    return codeStep({ field: "code", message: messageForError(error) });
  }
}

/** Saves the sign-in and redirects. When the browser refuses the save, the step shows the reason. */
function finishSignIn(
  response: LoginResponse,
  failed: (error: LoginError) => LoginActionResult,
): Response | LoginActionResult {
  const saved = writeSession({ token: response.token, name: response.user.name });
  if (!saved) {
    return failed({ field: "form", message: SAVE_FAILED });
  }
  return redirect("/admin");
}

function signInError(error: LoginError): LoginActionResult {
  return { step: "sign-in", error };
}
