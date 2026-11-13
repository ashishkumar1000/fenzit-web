import { redirect, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession, readSession } from "../../services/session";
import { fetchCurrentUser, type CurrentUser } from "./adminApi";
import { fetchOwnerReport, type OwnerReportResponse } from "./jobReportsApi";
import type { ReportRange } from "./jobReportsApi";
import { istEndOfLastMonth, istFirstOfMonth, istShifted, istToday } from "./format";
import type { Slice } from "./slice";
import { settle } from "./slice";

/**
 * Loaders for the console layout and a shared helper for the child sections.
 * No saved sign-in means /login. The BE is asked who the person is on every
 * load; a 401 or 403 clears the sign-in and redirects. Any other failure in
 * the layout shows a retry, not a redirect.
 *
 * For an owner the layout loader also fetches the reports dashboard
 * (Epic 22, CAP-8) — it is the landing view, and one /users/me call decides
 * the role before the report fetch. A failed report degrades to a retry line
 * on the dashboard; the console around it still works.
 */

export type ConsoleRole = "staff" | "owner" | "member";

/** The owner dashboard as the layout carries it: the range is resolved from
 *  the URL (`?range=` presets) so the preset links are plain navigation. */
export type OwnerDashboard = {
  kind: "dashboard";
  range: ReportRange;
  report: Slice<OwnerReportResponse>;
};

export type AdminLayoutData =
  | {
      status: "ok";
      name: string | null;
      role: ConsoleRole;
      dashboard: OwnerDashboard | null;
    }
  | { status: "failed" };

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
      { to: "/admin/reports", label: "Reports" },
      { to: "/admin/deletion-requests", label: "Deletion requests" },
      { to: "/admin/config", label: "Config" },
    ];
  }
  if (role === "owner") {
    return [
      { to: "/admin", label: "Dashboard" },
      { to: "/admin/company", label: "Overview" },
      { to: "/admin/company/customers", label: "Customers" },
      { to: "/admin/company/employees", label: "Employees" },
      { to: "/admin/company/approvals", label: "Approvals" },
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

export async function loadMe(request: Request): Promise<{ token: string; me: CurrentUser }> {
  const session = readSession();
  if (session === null) {
    throw redirect("/login");
  }
  const me = await fetchCurrentUser(session.token, request.signal);
  return { token: session.token, me };
}

/** The owner's dashboard range, resolved from the URL's `?range=` preset.
 *  Every window is built on IST days — that is how the server computes the
 *  report — so a browser in another timezone still matches the server's day
 *  boundaries. */
function ownerRange(url: URL): { from: string; to: string } {
  const today = istToday();
  switch (url.searchParams.get("range")) {
    case "today":
      return { from: today, to: today };
    case "7":
      return { from: istShifted(-6), to: today };
    case "30":
      return { from: istShifted(-29), to: today };
    case "this-month":
      return { from: istFirstOfMonth(), to: today };
    case "last-month":
      return { from: istFirstOfMonth(-1), to: istEndOfLastMonth() };
    case "custom": {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (from !== null && from !== "" && to !== null && to !== "") {
        return { from, to };
      }
      return { from: istShifted(-29), to: today };
    }
    default:
      return { from: istShifted(-29), to: today };
  }
}

export async function adminLoader({ request }: LoaderFunctionArgs): Promise<AdminLayoutData> {
  try {
    const { token, me } = await loadMe(request);
    const role = consoleRole(me);
    let dashboard: OwnerDashboard | null = null;
    if (role === "owner") {
      const range = ownerRange(new URL(request.url));
      const report = await settle(() => fetchOwnerReport(token, range, request.signal));
      dashboard = { kind: "dashboard", range, report };
    }
    return { status: "ok", name: me.name, role, dashboard };
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
