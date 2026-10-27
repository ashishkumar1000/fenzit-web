import { redirect, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { lookupUser } from "./adminApi";
import type { LookupResponse } from "./dossier-types";

export type AccountData =
  | { state: "idle" }
  | { state: "found"; phone: string; dossier: LookupResponse; meUserId: string }
  | { state: "not-found"; phone: string }
  | { state: "invalid"; phone: string }
  | { state: "error" };

/**
 * Loader for /admin/account (staff only): the same exact-phone lookup as
 * Inspect, plus the caller's id so the flag controls can refuse self-actions
 * before any request is made.
 */
export async function adminAccountLoader({ request }: LoaderFunctionArgs): Promise<AccountData> {
  try {
    const { token, me } = await requireConsoleRole(request, ["staff"]);
    const phone = new URL(request.url).searchParams.get("phone")?.trim() ?? "";
    if (phone === "") return { state: "idle" };
    try {
      const dossier = await lookupUser(token, phone, request.signal);
      return { state: "found", phone, dossier, meUserId: me.id };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { state: "not-found", phone };
      }
      // The backend refused the input itself (not a 10-digit Indian number).
      if (error instanceof ApiError && error.status === 400) {
        return { state: "invalid", phone };
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
    return { state: "error" };
  }
}
