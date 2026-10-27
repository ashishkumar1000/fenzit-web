import { redirect, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import {
  FALLBACK_COUNTRY_CODES,
  fetchCountryCodes,
  type CountryCode,
} from "../../services/countryCodes";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { lookupUser } from "./adminApi";
import type { LookupResponse } from "./dossier-types";

export type AccountData =
  | { state: "idle"; countries: CountryCode[] }
  | {
      state: "found";
      phone: string;
      dossier: LookupResponse;
      meUserId: string;
      countries: CountryCode[];
    }
  | { state: "not-found"; phone: string; countries: CountryCode[] }
  | { state: "invalid"; countries: CountryCode[] }
  | { state: "error"; countries: CountryCode[] };

/** The dial-code list, with the India fallback when the public endpoint is
 *  unreachable — the search keeps working either way. */
async function loadCountries(request: Request): Promise<CountryCode[]> {
  try {
    const list = await fetchCountryCodes(request.signal);
    return list.length > 0 ? list : FALLBACK_COUNTRY_CODES;
  } catch {
    return FALLBACK_COUNTRY_CODES;
  }
}

/** Joins the two search fields the way the API expects them: "+919876543210". */
function phoneFromParams(params: URLSearchParams): string {
  const number = (params.get("number") ?? "").replace(/[\s()-]/g, "");
  if (number === "") return "";
  const dialCode = (params.get("dialCode") ?? "+91").replace(/\s/g, "");
  return `${dialCode}${number}`;
}

/**
 * Loader for /admin/account (staff only): the same exact-phone lookup as
 * Inspect, plus the caller's id so the flag controls can refuse self-actions
 * before any request is made.
 */
export async function adminAccountLoader({ request }: LoaderFunctionArgs): Promise<AccountData> {
  try {
    const { token, me } = await requireConsoleRole(request, ["staff"]);
    const url = new URL(request.url);
    const phone = phoneFromParams(url.searchParams);
    const countries = loadCountries(request);
    if (phone === "") return { state: "idle", countries: await countries };
    try {
      const dossier = await lookupUser(token, phone, request.signal);
      return {
        state: "found",
        phone,
        dossier,
        meUserId: me.id,
        countries: await countries,
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { state: "not-found", phone, countries: await countries };
      }
      // The backend refused the input itself (not a valid phone number).
      if (error instanceof ApiError && error.status === 400) {
        return { state: "invalid", countries: await countries };
      }
      throw error;
    }
  } catch (error) {
    // A redirect thrown deeper down (wrong role, dead session) is navigation.
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "error", countries: FALLBACK_COUNTRY_CODES };
  }
}
