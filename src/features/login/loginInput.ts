import { checkPhone, EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "../../utils/contactValidation";

/** Phone sign-in is India-only for now, the same default as the early-access form. */
export const LOGIN_DIAL_CODE = "+91";

export type Identifier =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "email"; email: string }
  | { kind: "phone"; phoneNumber: string; label: string };

const PHONE_HINT =
  "Type the 10-digit mobile number, with or without +91. Do not add a 0 or 00 at the start.";

/**
 * Decides which sign-in path the typed value takes. A value with "@" is an
 * email. Anything else is a phone number, checked with the same rule as the
 * early-access form. Returns the digits the BE expects.
 */
export function classifyIdentifier(raw: string): Identifier {
  const value = raw.trim();
  if (value === "") return { kind: "empty" };

  if (value.includes("@")) {
    const email = value.toLowerCase();
    if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
      return { kind: "invalid", message: "Enter a valid email address." };
    }
    return { kind: "email", email };
  }

  const cleaned = value.replace(/[\s\-().]/g, "");
  let national = cleaned;
  if (cleaned.startsWith("+91")) {
    national = cleaned.slice(3);
  } else if (cleaned.startsWith("+")) {
    return { kind: "invalid", message: PHONE_HINT };
  }

  const check = checkPhone(LOGIN_DIAL_CODE, national);
  if (check.kind !== "valid") {
    return { kind: "invalid", message: PHONE_HINT };
  }
  const phoneNumber = check.phone.slice(LOGIN_DIAL_CODE.length);
  // Indian mobile numbers are 10 digits. The shared early-access rule is looser, so this path checks the length itself.
  if (phoneNumber.length !== 10) {
    return { kind: "invalid", message: PHONE_HINT };
  }
  return { kind: "phone", phoneNumber, label: formatPhoneLabel(phoneNumber) };
}

/** "+91 98765 43210" for the code step, so the owner can check the number. */
export function formatPhoneLabel(phoneNumber: string): string {
  const digits =
    phoneNumber.length === 10 ? `${phoneNumber.slice(0, 5)} ${phoneNumber.slice(5)}` : phoneNumber;
  return `${LOGIN_DIAL_CODE} ${digits}`;
}
