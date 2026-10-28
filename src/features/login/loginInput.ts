import type { CountryCode } from "../../services/countryCodes";
import { EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "../../utils/contactValidation";

/** The only country code sign-in by phone supports. fenzit-be refuses any other. */
export const LOGIN_DIAL_CODE = "+91";

/** The one choice the country code field shows on the login page. */
export const LOGIN_COUNTRY_CODES: CountryCode[] = [
  { dialCode: LOGIN_DIAL_CODE, countryName: "India", iso2: "IN" },
];

export const INDIA_ONLY_MESSAGE =
  "Phone sign-in works only with +91 mobile numbers for now. You can sign in with your email instead.";
const PHONE_HINT =
  "Type the 10-digit mobile number without the country code, starting with 6 to 9. Do not add a 0 or 00 at the start.";
/** An Indian mobile number: 10 digits, starting with 6, 7, 8 or 9. Matches fenzit-be SendOtpDto. */
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export type Identifier =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "email"; email: string }
  | { kind: "phone"; dialCode: string; phoneNumber: string; label: string };

/**
 * Decides which sign-in path the typed value takes. A value with "@" is an email. Anything else
 * is an Indian mobile number: 10 digits, with an optional +91 or 91 in front. Returns the digits
 * the BE expects.
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
  if (cleaned.startsWith("+")) {
    // A full number with +91 is accepted, so pasting "+91 98765 43210" still works.
    if (!cleaned.startsWith(LOGIN_DIAL_CODE)) {
      return { kind: "invalid", message: INDIA_ONLY_MESSAGE };
    }
    national = cleaned.slice(LOGIN_DIAL_CODE.length);
  } else if (/^91\d{10}$/.test(cleaned)) {
    // "91" then 10 digits is a full Indian number typed without the plus sign.
    national = cleaned.slice(2);
  }

  if (!INDIAN_MOBILE.test(national)) {
    return { kind: "invalid", message: PHONE_HINT };
  }
  return {
    kind: "phone",
    dialCode: LOGIN_DIAL_CODE,
    phoneNumber: national,
    label: formatPhoneLabel(LOGIN_DIAL_CODE, national),
  };
}

/** "+91 98765 43210" for the code step, so the owner can check the number. */
export function formatPhoneLabel(dialCode: string, phoneNumber: string): string {
  const digits =
    phoneNumber.length === 10 ? `${phoneNumber.slice(0, 5)} ${phoneNumber.slice(5)}` : phoneNumber;
  return `${dialCode} ${digits}`;
}
