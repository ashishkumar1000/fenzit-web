import type { ActionFunctionArgs } from "react-router";
import { messageForError } from "../../utils/errorMessages";
import { sendDeletionCode, submitDeletionRequest } from "./deletionApi";
import { formatPhoneLabel, PHONE_HINT, phoneFromInput } from "./deletionInput";

/**
 * What the deletion page shows next. "phone" is the first step, "code" is the
 * step after a code was sent, and "done" means the request was received.
 */
export type DeletionStep =
  | { step: "phone"; error?: string }
  | { step: "code"; otpSessionId: string; phoneLabel: string; error?: string }
  | { step: "done" };

const CODE_HINT = "Enter the 4-digit code we sent you.";
const CONFIRM_HINT =
  "Tick the box to confirm you understand. Nothing is deleted until our team approves the request.";
const START_AGAIN = "That code request has ended. Enter your number again to get a new code.";

/** Route action for /delete-account. The hidden `intent` field picks the step. */
export async function deleteAccountAction({ request }: ActionFunctionArgs): Promise<DeletionStep> {
  const form = await request.formData();
  return String(form.get("intent") ?? "") === "submit-code" ? submitCode(form) : sendCode(form);
}

async function sendCode(form: FormData): Promise<DeletionStep> {
  const phoneNumber = phoneFromInput(String(form.get("phone") ?? ""));
  if (phoneNumber === null) {
    return { step: "phone", error: PHONE_HINT };
  }
  try {
    const sent = await sendDeletionCode(phoneNumber);
    return {
      step: "code",
      otpSessionId: sent.otp_session_id,
      phoneLabel: formatPhoneLabel(phoneNumber),
    };
  } catch (error) {
    return { step: "phone", error: messageForError(error) };
  }
}

async function submitCode(form: FormData): Promise<DeletionStep> {
  const otpSessionId = String(form.get("otpSessionId") ?? "");
  const phoneLabel = String(form.get("phoneLabel") ?? "");
  if (otpSessionId === "") {
    return { step: "phone", error: START_AGAIN };
  }
  const otpCode = String(form.get("otpCode") ?? "").trim();
  const codeStep = (error?: string): DeletionStep => ({
    step: "code",
    otpSessionId,
    phoneLabel,
    ...(error ? { error } : {}),
  });

  if (form.get("confirm") !== "yes") {
    // Checked on the server too: the page's required box is not enough on its own.
    return codeStep(CONFIRM_HINT);
  }
  if (!/^\d{4}$/.test(otpCode)) {
    return codeStep(CODE_HINT);
  }
  try {
    await submitDeletionRequest(otpSessionId, otpCode);
    return { step: "done" };
  } catch (error) {
    return codeStep(messageForError(error));
  }
}
