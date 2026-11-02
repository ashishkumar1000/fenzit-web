/** An Indian mobile number: 10 digits, starting with 6, 7, 8 or 9. Matches fenzit-be SendOtpDto. */
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export const PHONE_HINT =
  "Type the 10-digit mobile number you sign in with, starting with 6 to 9. Do not add a 0 at the start.";

/**
 * Returns the 10 digits of an Indian mobile number, or null. A +91 or 91 in
 * front is accepted, so a pasted "+91 98765 43210" works.
 */
export function phoneFromInput(raw: string): string | null {
  let cleaned = raw.trim().replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (/^91\d{10}$/.test(cleaned)) {
    cleaned = cleaned.slice(2);
  }
  return INDIAN_MOBILE.test(cleaned) ? cleaned : null;
}

/** "+91 98765 43210" for the code step, so the person can check the number. */
export function formatPhoneLabel(phoneNumber: string): string {
  return `+91 ${phoneNumber.slice(0, 5)} ${phoneNumber.slice(5)}`;
}
