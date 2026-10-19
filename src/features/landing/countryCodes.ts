import { apiFetch } from "../../services/api";

export type CountryCode = {
  /** International dial code with the plus sign, for example +91. */
  dialCode: string;
  countryName: string;
  /** ISO 3166-1 alpha-2 code, for example IN. */
  iso2: string;
};

export type CountryCodesData = {
  /** Streamed: the page renders with the fallback list, then the full list replaces it. */
  countryCodes: Promise<CountryCode[]>;
};

/** The dropdown starts on India. Any visitor can pick another country. */
export const DEFAULT_DIAL_CODE = "+91";

/** The list loads in the background. A slow request gives up after this and uses the fallback. */
export const COUNTRY_CODES_TIMEOUT_MS = 3000;

// Used when the list cannot load, and first while it loads. The form still works, with India as the only choice.
export const FALLBACK_COUNTRY_CODES: CountryCode[] = [
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

async function loadCountryCodes(): Promise<CountryCode[]> {
  try {
    const countryCodes = await fetchCountryCodes(AbortSignal.timeout(COUNTRY_CODES_TIMEOUT_MS));
    const usable = countryCodes.filter(isCountryCode);
    return usable.length > 0 ? usable : FALLBACK_COUNTRY_CODES;
  } catch {
    return FALLBACK_COUNTRY_CODES;
  }
}

/**
 * Route loader for the home page. It does not wait for the list: the promise is
 * handed to the page at once, so the hero paints while the request runs. A slow
 * or failed list falls back to India alone after COUNTRY_CODES_TIMEOUT_MS, and
 * rows the form cannot use are dropped.
 */
export function countryCodesLoader(): CountryCodesData {
  return { countryCodes: loadCountryCodes() };
}
