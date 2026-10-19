import type { ActionFunctionArgs } from "react-router";
import { checkPhone, EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "../../utils/contactValidation";
import { messageForError } from "../../utils/errorMessages";
import { joinEarlyAccess } from "./earlyAccessApi";

export type EarlyAccessResult =
  | { ok: true; email: string; reference: string }
  | { ok: false; error: string; field?: "email" | "phone" };

/**
 * Route action for the home page sign-up form. It checks the input on the
 * client first, then saves it through fenzit-be. The server checks it again.
 */
export async function earlyAccessAction({
  request,
}: ActionFunctionArgs): Promise<EarlyAccessResult> {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const phone = checkPhone(String(form.get("dialCode") ?? ""), String(form.get("phone") ?? ""));

  // maxLength on the input only limits typing. Posted data needs this check too.
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Please enter a valid email address.", field: "email" };
  }
  if (phone.kind === "invalid") {
    return {
      ok: false,
      error:
        "Type the number after the country code, without a plus sign, 00 or a leading 0. Or leave the phone box empty.",
      field: "phone",
    };
  }

  try {
    const response = await joinEarlyAccess({
      email,
      ...(phone.kind === "valid" ? { phone: phone.phone } : {}),
    });
    return { ok: true, email, reference: response.reference };
  } catch (error) {
    return { ok: false, error: messageForError(error) };
  }
}
