import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession } from "../../services/session";
import { messageForError } from "../../utils/errorMessages";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { fetchJobsPage, type JobsPageResult } from "./companyApi";
import type { LeaveRow, Page } from "./companyApi";
import { settle, type Slice } from "./slice";
import { fetchEmployment, fetchStructures } from "./payrollApi";
import type { EmploymentView } from "./payrollViews";
import type { SalaryStructureView } from "./payrollViews";
import {
  fetchEmployeeLeave,
  fetchEnrolments,
  fetchLeaveBalances,
  fetchMember,
  fetchOffice,
  fetchPayslips,
  fetchPunches,
  setMemberActive,
  type EmployeeProfile,
  type EnrolmentRow,
  type LeaveBalance,
  type OfficeDetail,
  type PunchRow,
  type PayslipRow,
} from "./employeeProfileApi";
import { istToday } from "./format";

/**
 * Loaders for one employee's profile page — the payroll page's idiom: the
 * URL's `?tab=` picks the section and only that section's data is fetched;
 * every section settles on its own so one failed fetch is a quiet line,
 * never a blank page. The header member read is NOT settled — without it
 * there is no page — and a stale id answers a `not-found` state, not a
 * failed one. The deactivate/reinstate action posts to this same route.
 */

export type EmployeeProfileTab = "master" | "jobs" | "attendance" | "leave" | "payroll";

const TABS = new Set<EmployeeProfileTab>(["master", "jobs", "attendance", "leave", "payroll"]);

/** The address's tab — Master Record when the address is bare (the first tab
 *  links to the bare path, the Tabs component's convention). */
export function readEmployeeProfileTab(url: URL): EmployeeProfileTab {
  const requested = url.searchParams.get("tab") ?? "";
  return TABS.has(requested as EmployeeProfileTab) ? (requested as EmployeeProfileTab) : "master";
}

const MONTH_SHAPE = /^\d{4}-(?:0[1-9]|1[0-2])$/;

/** `YYYY-MM` → [first day, last day] as `YYYY-MM-DD` strings. */
function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/** The `count` month names ending with the current one (oldest first). */
function recentMonths(count: number): string[] {
  const today = istToday(); // YYYY-MM-DD
  const [y, m] = today.split("-").map(Number);
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export type EmployeeProfileData =
  | { state: "failed"; tab: EmployeeProfileTab }
  | { state: "not-found" }
  | {
      state: "ok";
      selfUserId: string;
      tab: "master";
      member: EmployeeProfile;
      employment: Slice<EmploymentView>;
    }
  | {
      state: "ok";
      selfUserId: string;
      tab: "jobs";
      member: EmployeeProfile;
      jobs: Slice<JobsPageResult>;
    }
  | {
      state: "ok";
      selfUserId: string;
      tab: "attendance";
      member: EmployeeProfile;
      month: string;
      enrolment: Slice<EnrolmentRow | null>;
      office: Slice<OfficeDetail | null>;
      punches: Slice<PunchRow[]>;
    }
  | {
      state: "ok";
      selfUserId: string;
      tab: "leave";
      member: EmployeeProfile;
      balances: Slice<LeaveBalance[]>;
      requests: Slice<Page<LeaveRow>>;
    }
  | {
      state: "ok";
      selfUserId: string;
      tab: "payroll";
      member: EmployeeProfile;
      structures: Slice<SalaryStructureView[]>;
      payslips: Slice<PayslipRow[]>;
    };

export async function employeeProfileLoader({
  request,
  params,
}: LoaderFunctionArgs): Promise<EmployeeProfileData> {
  const url = new URL(request.url);
  const tab = readEmployeeProfileTab(url);
  const userId = params.userId ?? "";
  try {
    const { token, me } = await requireConsoleRole(request, ["owner"]);
    // The header member read is the page's spine — a stale or foreign id is
    // its own honest state ("nobody here"), not a failed page.
    let member: EmployeeProfile;
    try {
      member = await fetchMember(token, userId, request.signal);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { state: "not-found" };
      }
      throw error;
    }

    switch (tab) {
      case "master": {
        return {
          state: "ok",
          selfUserId: me.id,
          tab,
          member,
          employment: await settle(() => fetchEmployment(token, userId, request.signal)),
        };
      }
      case "jobs": {
        return {
          state: "ok",
          selfUserId: me.id,
          tab,
          member,
          jobs: await settle(() =>
            fetchJobsPage(token, { page: 1, pageSize: 50, technicianId: userId }, request.signal),
          ),
        };
      }
      case "attendance": {
        const requested = url.searchParams.get("month");
        const month =
          requested !== null && MONTH_SHAPE.test(requested) ? requested : istToday().slice(0, 7);
        const { from, to } = monthBounds(month);
        const enrolment = await settle(async (): Promise<EnrolmentRow | null> => {
          const roster = await fetchEnrolments(token, request.signal);
          return roster.find((row) => row.employeeId === userId) ?? null;
        });
        // The office detail only makes sense with an assigned office; a
        // not-enrolled employee's rules card has nothing honest to show.
        const officeId =
          enrolment.ok && enrolment.data?.officeId != null ? enrolment.data.officeId : null;
        const [office, punchesResult] = await Promise.all([
          officeId !== null
            ? settle(() => fetchOffice(token, officeId, request.signal))
            : Promise.resolve({ ok: true, data: null } as Slice<OfficeDetail | null>),
          settle(() => fetchPunches(token, userId, from, to, request.signal)),
        ]);
        const punches: Slice<PunchRow[]> = punchesResult.ok
          ? { ok: true, data: punchesResult.data.punches }
          : { ok: false };
        return { state: "ok", selfUserId: me.id, tab, member, month, enrolment, office, punches };
      }
      case "leave": {
        const [balances, requests] = await Promise.all([
          settle(() => fetchLeaveBalances(token, userId, request.signal)),
          settle(() => fetchEmployeeLeave(token, userId, request.signal)),
        ]);
        return { state: "ok", selfUserId: me.id, tab, member, balances, requests };
      }
      default: {
        // The payslips endpoint answers a whole month at once; the profile
        // reads the recent months in parallel and keeps this employee's rows.
        const months = recentMonths(3);
        const perMonth = await Promise.all(
          months.map((month) => settle(() => fetchPayslips(token, month, request.signal))),
        );
        const payslips: Slice<PayslipRow[]> = perMonth.every((slice) => slice.ok)
          ? {
              ok: true,
              data: perMonth
                .flatMap((slice) => (slice as { ok: true; data: PayslipRow[] }).data)
                .filter((row) => row.user_id === userId)
                .sort((a, b) => b.salary_period.localeCompare(a.salary_period)),
            }
          : { ok: false };
        return {
          state: "ok",
          selfUserId: me.id,
          tab,
          member,
          structures: await settleStructures(token, userId, request.signal),
          payslips,
        };
      }
    }
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed", tab };
  }
}

/** The structures read: a 404 (no structure yet) reads as an honest empty,
 *  the same rule the payroll page's structures tab uses. */
async function settleStructures(
  token: string,
  userId: string,
  signal: AbortSignal,
): Promise<Slice<SalaryStructureView[]>> {
  try {
    return { ok: true, data: await fetchStructures(token, userId, signal) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { ok: true, data: [] };
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw error;
    }
    return { ok: false };
  }
}

/** ── The profile's own action: park or reinstate the member ───────────── */

export type EmployeeActivateResult =
  { state: "done"; status: string } | { state: "error"; message: string };

export async function employeeProfileAction({
  request,
  params,
}: ActionFunctionArgs): Promise<EmployeeActivateResult> {
  const form = await request.formData();
  if (form.get("intent") !== "activate") {
    return { state: "error", message: "Nothing to do — unknown action." };
  }
  const userId = params.userId ?? "";
  const active = form.get("active") === "true";
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    const result = await setMemberActive(token, userId, active, request.signal);
    return { state: "done", status: result.status };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    // The BE's refusals are plain-English copy (wrong state, last admin) —
    // same verbatim-4xx contract as the employment save.
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 403
    ) {
      const errBody = error.body as { message?: unknown } | undefined;
      if (errBody !== undefined && typeof errBody.message === "string" && errBody.message !== "") {
        return { state: "error", message: errBody.message };
      }
    }
    return { state: "error", message: messageForError(error) };
  }
}
