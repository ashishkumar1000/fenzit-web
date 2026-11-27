import { redirect, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession, readSession } from "../../services/session";
import { readLeaveSummaryCached } from "./leaveSummaryCache";
import { invalidateIdentityCache, readCurrentUserCached } from "./identityCache";
import type { CurrentUser } from "./adminApi";

export type ConsoleRole = "staff" | "owner" | "member";

export type AdminLayoutData =
  | {
      status: "ok";
      name: string | null;
      role: ConsoleRole;
      /** The Leave sidebar badge's count — null when unknown (non-owner, a
       *  failed summary read) so the badge simply doesn't render. */
      pendingLeaves: number | null;
    }
  | { status: "failed" };

export interface SectionLink {
  to: string;
  label: string;
  /** A row the design shows but the console cannot open yet — rendered as a
   *  muted, non-interactive item with the reason in its tooltip. */
  disabled?: boolean;
}

/** Staff sees everything; an owner sees the company; a member sees their own
 *  profile and their own jobs — the jobs list self-scopes on the server. */
export function consoleRole(me: CurrentUser): ConsoleRole {
  if (me.platformAdmin) return "staff";
  if (me.role === "company_admin") return "owner";
  return "member";
}

export function sectionsFor(role: ConsoleRole): SectionLink[] {
  if (role === "staff") {
    return [
      { to: "/admin/inspect", label: "Inspect Person" },
      { to: "/admin/account", label: "Account Details" },
      { to: "/admin/reports", label: "Reports" },
      { to: "/admin/deletion-requests", label: "Delete Requests" },
      { to: "/admin/config", label: "App Settings" },
      { to: "/admin/help", label: "Help & Support" },
    ];
  }
  if (role === "owner") {
    return [
      { to: "/admin/company", label: "Overview" },
      { to: "/admin/company/customers", label: "Customers" },
      { to: "/admin/company/employees", label: "Employees" },
      { to: "/admin/company/payroll", label: "Salary" },
      { to: "/admin/company/jobs", label: "Jobs" },
      { to: "/admin/company/holidays", label: "Holidays" },
      { to: "/admin/company/leave", label: "Leave" },
      { to: "/admin/company/attendance", label: "Attendance" },
      { to: "/admin/help", label: "Help & Support" },
    ];
  }
  return [
    { to: "/admin/me", label: "My Details" },
    { to: "/admin/company/jobs", label: "Jobs" },
    { to: "/admin/help", label: "Help & Support" },
  ];
}

/** The sidebar's nav clusters: a small caption over its links (null caption
 *  = the cluster stands alone). Only the owner sidebar groups — staff and
 *  member lists are short enough to read as one column. The flat list stays
 *  in `sectionsFor` for anything that walks every section. */
export interface SectionGroup {
  caption: string | null;
  links: SectionLink[];
}

export function sectionGroupsFor(role: ConsoleRole): SectionGroup[] {
  if (role !== "owner") {
    return [{ caption: null, links: sectionsFor(role) }];
  }
  const byTo = new Map(sectionsFor(role).map((section) => [section.to, section]));
  const pick = (tos: string[]): SectionLink[] =>
    tos.flatMap((to) => {
      const section = byTo.get(to);
      return section ? [section] : [];
    });
  return [
    { caption: null, links: pick(["/admin/company"]) },
    { caption: "Business", links: pick(["/admin/company/customers", "/admin/company/jobs"]) },
    {
      caption: "Team",
      links: pick([
        "/admin/company/employees",
        "/admin/company/leave",
        "/admin/company/attendance",
        "/admin/company/holidays",
      ]),
    },
    { caption: "Payroll", links: pick(["/admin/company/payroll"]) },
    {
      caption: "Preferences",
      links: [
        // The design's Settings row. No settings screen exists yet, so it is
        // shown disabled rather than left out of the sidebar.
        { to: "/admin/settings", label: "Settings", disabled: true },
        ...pick(["/admin/help"]),
      ],
    },
  ];
}

/** The sidebar's Leave badge: the tenant's pending requests, riding the same
 *  summary read the requests tab uses — through the module's shared cache,
 *  so the parallel layout+child loader pair is one network call. Any failure
 *  on this cosmetic read costs the badge only — except a dead session (401),
 *  which still reaches the loader's login redirect; a permission-shaped 403
 *  never logs anyone out. An abort shows up only in the catch — the shared
 *  fetch carries no signal (one navigation's abort must not kill another
 *  loader's read) — and rethrows there so the router drops the result it
 *  would have dropped anyway. */
async function pendingLeavesOrNull(token: string, signal: AbortSignal): Promise<number | null> {
  try {
    const summary = await readLeaveSummaryCached(token);
    return summary.counts?.pending ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    if (signal.aborted) throw error;
    return null;
  }
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
  // A navigation already superseded does not start the shared read; the read
  // itself carries no caller signal — it may serve another loader mid-flight
  // (the shared-fetch rule, same as the leave summary cache).
  if (request.signal.aborted) throw new DOMException("Aborted", "AbortError");
  // CAP-8: the identity rides the shared 30s cache, so the layout loader's
  // access check and every requireConsoleRole in the same burst share one
  // /users/me read.
  const me = await readCurrentUserCached(session.token);
  return { token: session.token, me };
}

export async function adminLoader({ request }: LoaderFunctionArgs): Promise<AdminLayoutData> {
  try {
    const { me, token } = await loadMe(request);
    const role = consoleRole(me);
    // Owners only — no Leave section, no summary read. The count refreshes
    // whenever this layout loader re-runs: a submission anywhere in the
    // console (a decision's fetcher post) is a revalidation, and the
    // layout's shouldRevalidate lets submissions through, so a decision
    // updates the badge in the same sweep.
    const pendingLeaves =
      role === "owner" ? await pendingLeavesOrNull(token, request.signal) : null;
    return { status: "ok", name: me.name, role, pendingLeaves };
  } catch (error) {
    // A redirect thrown deeper down (no session) is navigation, not a failure.
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      // The token died under the access check — nothing it fetched may be
      // trusted past this point.
      invalidateIdentityCache();
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
