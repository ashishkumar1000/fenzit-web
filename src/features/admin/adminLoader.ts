import { redirect, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession, readSession } from "../../services/session";
import { fetchCurrentUser, type CurrentUser } from "./adminApi";

/**
 * Loaders for the console layout and a shared helper for the child sections.
 * No saved sign-in means /login. The BE is asked who the person is on every
 * load; a 401 or 403 clears the sign-in and redirects. Any other failure in
 * the layout shows a retry, not a redirect.
 */

export type ConsoleRole = "staff" | "owner" | "member";

export type AdminLayoutData =
  { status: "ok"; name: string | null; role: ConsoleRole } | { status: "failed" };

export interface SectionLink {
  to: string;
  label: string;
}

/** Staff sees everything; an owner sees the company; anyone else, only themselves. */
export function consoleRole(me: CurrentUser): ConsoleRole {
  if (me.platformAdmin) return "staff";
  if (me.role === "company_admin") return "owner";
  return "member";
}

export function sectionsFor(role: ConsoleRole): SectionLink[] {
  if (role === "staff") {
    return [
      { to: "/admin/inspect", label: "Inspect" },
      { to: "/admin/account", label: "Account" },
    ];
  }
  if (role === "owner") {
    return [
      { to: "/admin/company", label: "Overview" },
      { to: "/admin/company/customers", label: "Customers" },
      { to: "/admin/company/employees", label: "Employees" },
      { to: "/admin/company/jobs", label: "Jobs" },
      { to: "/admin/company/holidays", label: "Holidays" },
      { to: "/admin/company/attendance", label: "Attendance" },
    ];
  }
  return [{ to: "/admin/me", label: "Me" }];
}

/** The sign-in is no longer valid, so the session must go before redirecting. */
export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

async function loadMe(request: Request): Promise<{ token: string; me: CurrentUser }> {
  const session = readSession();
  if (session === null) {
    throw redirect("/login");
  }
  const me = await fetchCurrentUser(session.token, request.signal);
  return { token: session.token, me };
}

export async function adminLoader({ request }: LoaderFunctionArgs): Promise<AdminLayoutData> {
  try {
    const { me } = await loadMe(request);
    return { status: "ok", name: me.name, role: consoleRole(me) };
  } catch (error) {
    // A redirect thrown deeper down (no session) is navigation, not a failure.
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
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

/**
 * Child-section loaders ask for the caller's role and refuse sections it does
 * not cover by going home — the layout tabs never render a refused link, this
 * guards a hand-typed URL.
 */
export async function requireConsoleRole(
  request: Request,
  roles: ConsoleRole[],
): Promise<{ token: string; me: CurrentUser }> {
  const { token, me } = await loadMe(request);
  if (!roles.includes(consoleRole(me))) {
    throw redirect("/admin");
  }
  return { token, me };
}
