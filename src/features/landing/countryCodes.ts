import { apiFetch } from "../../services/api";

export type CountryCode = {
  /** International dial code with the plus sign, for example +91. */
  dialCode: string;
  countryName: string;
  /** ISO 3166-1 alpha-2 code, for example IN. */
  iso2: string;
};

export type CountryCodesData = {
  countryCodes: CountryCode[];
};

/** The dropdown starts on India. Any visitor can pick another country. */
export const DEFAULT_DIAL_CODE = "+91";

/** The home page waits for this list, so give up quickly and use the fallback. */
export const COUNTRY_CODES_TIMEOUT_MS = 3000;

// Used when the list cannot load. The form still works, with India as the only choice.
const FALLBACK_COUNTRY_CODES: CountryCode[] = [
  { dialCode: "+91", countryName: "India", iso2: "IN" },
];

/** GET /api/v1/country-codes on fenzit-be. Public, so it sends no token. */
export function fetchCountryCodes(signal?: AbortSignal): Promise<CountryCode[]> {
  return apiFetch<CountryCode[]>("/api/v1/country-codes", { signal });
}

function isCountryCode(value: unknown): value is CountryCode {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.dialCode === "string" &&
    typeof row.countryName === "string" &&
    typeof row.iso2 === "string"
  );
}

/**
 * Route loader for the home page. A failed or slow reference list must not
 * hold up the page, so after COUNTRY_CODES_TIMEOUT_MS it falls back to India
 * alone. Rows the form cannot use are dropped.
 */
export async function countryCodesLoader(): Promise<CountryCodesData> {
  try {
    const countryCodes = await fetchCountryCodes(AbortSignal.timeout(COUNTRY_CODES_TIMEOUT_MS));
    const usable = countryCodes.filter(isCountryCode);
    return { countryCodes: usable.length > 0 ? usable : FALLBACK_COUNTRY_CODES };
  } catch {
    return { countryCodes: FALLBACK_COUNTRY_CODES };
  }
}
