// One @, no spaces. The name may use the letters, digits and symbols RFC 5322 allows
// (such as ' and +), with dots between parts but never at the start, end, or doubled.
// Each domain label is letters, digits and hyphens, and the top-level domain is two or
// more letters. fenzit-be checks email with its own pattern in the contact DTO, which is looser
// at the edges, so an address it accepts can still be refused here. Keep the two in step if one changes.
// RFC 5321 caps an address at 254 characters.
export const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*\.[A-Za-z]{2,}$/;
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
