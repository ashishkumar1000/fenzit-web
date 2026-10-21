import { redirect, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession, readSession } from "../../services/session";
import { fetchCurrentUser } from "./adminApi";

export type AdminLoaderData =
  { status: "ok"; name: string | null; allowed: boolean } | { status: "failed" };

/** Only these two roles may open the admin page (web login spec, roles spec decision 18). */
export function canOpenAdmin(role: string | null, platformAdmin: boolean): boolean {
  return platformAdmin || role === "company_admin";
}

/**
 * Route loader for /admin. No saved sign-in means /login. The BE is asked who
 * the person is on every load. A 401 or 403 means the sign-in is no longer
 * valid, so it is cleared and the person goes to /login. Any other failure
 * shows a retry, not a redirect.
 */
export async function adminLoader({ request }: LoaderFunctionArgs): Promise<AdminLoaderData> {
  const session = readSession();
  if (session === null) {
    throw redirect("/login");
  }

  try {
    const me = await fetchCurrentUser(session.token, request.signal);
    return {
      status: "ok",
      name: me.name,
      allowed: canOpenAdmin(me.role, me.platformAdmin),
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      clearSession();
      throw redirect("/login");
    }
    // A cancelled navigation is not a failed access check, so it is not shown as one.
    if (request.signal.aborted) {
      throw error;
    }
    return { status: "failed" };
  }
}
