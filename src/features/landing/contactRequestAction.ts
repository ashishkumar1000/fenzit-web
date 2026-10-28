import type { ActionFunctionArgs } from "react-router";
import { checkPhone, EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "../../utils/contactValidation";
import { messageForError } from "../../utils/errorMessages";
import { type ContactRequestKind, sendContactRequest } from "./contactRequestApi";

export type ContactRequestResult =
  | { ok: true; message: string }
  | { ok: false; error: string; field?: "name" | "company" | "email" | "phone" | "contact" };

const NAME_MAX_LENGTH = 120;
const COMPANY_MAX_LENGTH = 120;
const NOTE_MAX_LENGTH = 500;

/**
 * The call-back and demo forms share this check. It runs in the browser first;
 * fenzit-be checks the same rules again before it saves anything.
 */
async function submitContactRequest(
  request: Request,
  kind: ContactRequestKind,
): Promise<ContactRequestResult> {
  const form = await request.formData();
  const text = (key: string) => String(form.get(key) ?? "").trim();

  const name = text("name");
  const company = text("company");
  const email = text("email").toLowerCase();
  const note = text("note");
  const phone = checkPhone(text("dialCode"), text("phone"));

  if (kind === "demo" && name === "") {
    return { ok: false, error: "Type your name so we know who to call.", field: "name" };
  }
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, error: "That name is too long.", field: "name" };
  }
  if (company.length > COMPANY_MAX_LENGTH) {
    return { ok: false, error: "That company name is too long.", field: "company" };
  }
  // Postgres text cannot hold a NUL byte, so fenzit-be refuses it. Catch it here with a clear message.
  if ([name, company, email, note].some((value) => value.includes("\u0000"))) {
    return {
      ok: false,
      error: "Remove unusual characters from your details and try again.",
      field: "contact",
    };
  }
  if (note.length > NOTE_MAX_LENGTH) {
    return { ok: false, error: "Keep the note under 500 characters." };
  }
  if (email !== "" && (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email))) {
    return { ok: false, error: "Please enter a valid email address.", field: "email" };
  }
  if (phone.kind === "invalid") {
    return {
      ok: false,
      error:
        "Check the phone number. Use 7 to 15 digits after the country code, with no 0 or 00 in front.",
      field: "phone",
    };
  }
  if (email === "" && phone.kind === "none") {
    return {
      ok: false,
      error: "Add a phone number or an email address so we can reach you.",
      field: "contact",
    };
  }

  try {
    const response = await sendContactRequest({
      kind,
      ...(name !== "" ? { name } : {}),
      ...(company !== "" ? { company } : {}),
      ...(email !== "" ? { email } : {}),
      ...(phone.kind === "valid" ? { phone: phone.phone } : {}),
      ...(note !== "" ? { note } : {}),
    });
    return { ok: true, message: response.message };
  } catch (error) {
    return { ok: false, error: messageForError(error) };
  }
}

/** Route action for the "Request a call back" form on the home page. */
export function callBackAction({ request }: ActionFunctionArgs): Promise<ContactRequestResult> {
  return submitContactRequest(request, "call_back");
}

/** Route action for the "Book a demo" form on /book-demo. */
export function demoAction({ request }: ActionFunctionArgs): Promise<ContactRequestResult> {
  return submitContactRequest(request, "demo");
}
