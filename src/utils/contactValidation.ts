// One @, no spaces. Dots may separate labels but never start, end, or double up,
// so "a@b..c" and ".a@b.com" are rejected. RFC 5321 caps an address at 254 characters.
// Letters, digits and . _ % + - in the name; letters, digits and hyphens in each domain label;
// a top-level domain of two or more letters. Commas and other symbols are refused.
export const EMAIL_PATTERN =
  /^[A-Za-z0-9]+([._%+-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*\.[A-Za-z]{2,}$/;
export const EMAIL_MAX_LENGTH = 254;

export type PhoneCheck = { kind: "none" } | { kind: "valid"; phone: string } | { kind: "invalid" };

/**
 * Builds the phone number to save from the country code picked in the form and
 * the number typed after it. Spaces, hyphens, brackets and dots are ignored. A
 * blank number means "no phone". The typed number must not carry its own plus
 * sign, "00" prefix or leading 0 (a national trunk prefix), because the country
 * code comes from the dropdown. The
 * result is E.164 (a plus sign, then 7-15 digits), the form fenzit-be stores.
 */
export function checkPhone(dialCode: string, national: string): PhoneCheck {
  const cleaned = national.replace(/[\s\-().]/g, "");
  if (cleaned === "") return { kind: "none" };
  if (/^(\+|00)/.test(cleaned)) return { kind: "invalid" };
  // A leading 0 is a national trunk prefix (07911 123456 in the UK). It is not part of the international number.
  if (cleaned.startsWith("0")) return { kind: "invalid" };
  const candidate = `${dialCode}${cleaned}`;
  if (/^\+[1-9]\d{6,14}$/.test(candidate)) return { kind: "valid", phone: candidate };
  return { kind: "invalid" };
}
