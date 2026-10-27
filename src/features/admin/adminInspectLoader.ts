import { redirect, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { lookupUser } from "./adminApi";
import type { LookupResponse } from "./dossier-types";

export type InspectData =
  | { state: "idle" }
  | { state: "found"; phone: string; dossier: LookupResponse }
  | { state: "not-found"; phone: string }
  | { state: "invalid"; phone: string }
  | { state: "error" };

/**
 * Loader for /admin/inspect (staff only). The phone lives in the URL, so the
 * lookup is loader-owned navigation: submitting the search form is a GET, a
 * revalidation refetches the dossier.
 */
export async function adminInspectLoader({ request }: LoaderFunctionArgs): Promise<InspectData> {
  try {
    const { token } = await requireConsoleRole(request, ["staff"]);
    const phone = new URL(request.url).searchParams.get("phone")?.trim() ?? "";
    if (phone === "") return { state: "idle" };
    try {
      const dossier = await lookupUser(token, phone, request.signal);
      return { state: "found", phone, dossier };
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
