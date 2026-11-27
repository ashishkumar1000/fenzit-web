import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession } from "../../services/session";
import { messageForError } from "../../utils/errorMessages";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { fetchJobsPage, fetchMembers, setManager, type JobsPageResult } from "./companyApi";
import type { LeaveRow, MemberRow, Page } from "./companyApi";
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

/** The header facts every ok tab carries: who is signed in, the member, and
 *  the roster (settled) that resolves the chain's `(Owner)` mark and feeds
 *  the reporting-manager picker. */
type EmployeeProfileOk = {
  state: "ok";
  selfUserId: string;
  member: EmployeeProfile;
  directory: Slice<MemberRow[]>;
};

export type EmployeeProfileData =
  | { state: "failed"; tab: EmployeeProfileTab }
  | { state: "not-found" }
  | (EmployeeProfileOk & {
      tab: "master";
      employment: Slice<EmploymentView>;
    })
  | (EmployeeProfileOk & {
      tab: "jobs";
      jobs: Slice<JobsPageResult>;
    })
  | (EmployeeProfileOk & {
      tab: "attendance";
      month: string;
      enrolment: Slice<EnrolmentRow | null>;
      office: Slice<OfficeDetail | null>;
      punches: Slice<PunchRow[]>;
    })
  | (EmployeeProfileOk & {
      tab: "leave";
      balances: Slice<LeaveBalance[]>;
      requests: Slice<Page<LeaveRow>>;
    })
  | (EmployeeProfileOk & {
      tab: "payroll";
      structures: Slice<SalaryStructureView[]>;
      payslips: Slice<PayslipRow[]>;
    });

export async function employeeProfileLoader({
  request,
  params,
}: LoaderFunctionArgs): Promise<EmployeeProfileData> {
  const url = new URL(request.url);
  const tab = readEmployeeProfileTab(url);
  const userId = params.userId ?? "";
  try {
    const { token, me } = await requireConsoleRole(request, ["owner"]);
    // The roster read runs alongside the member read: the header's chain mark
    // and the manager picker both need it, and it can never blank the page.
    const directory = settle(() => fetchMembers(token, request.signal));
    // The not-found return below never awaits this slice. `settle` re-throws a
    // dead session, and an unobserved rejection here would hide that redirect.
    void directory.catch(() => undefined);
    // The header member read is the page's spine — a stale or foreign id is
    // its own honest state ("nobody here"), not a failed page. A malformed
    // id never reaches the member query (the BE's ParseUUIDPipe answers 400
    // first) and lands on the same not-found state.
    let member: EmployeeProfile;
    try {
      member = await fetchMember(token, userId, request.signal);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
        return { state: "not-found" };
      }
      throw error;
    }
    const roster = await directory;

    switch (tab) {
      case "master": {
        return {
          state: "ok",
          selfUserId: me.id,
          tab,
          member,
          directory: roster,
          employment: await settle(() => fetchEmployment(token, userId, request.signal)),
        };
      }
      case "jobs": {
        return {
          state: "ok",
          selfUserId: me.id,
          tab,
          member,
          directory: roster,
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
        return {
          state: "ok",
          selfUserId: me.id,
          tab,
          member,
          directory: roster,
          month,
          enrolment,
          office,
          punches,
        };
      }
      case "leave": {
        const [balances, requests] = await Promise.all([
          settle(() => fetchLeaveBalances(token, userId, request.signal)),
          settle(() => fetchEmployeeLeave(token, userId, request.signal)),
        ]);
        return {
          state: "ok",
          selfUserId: me.id,
          tab,
          member,
          directory: roster,
          balances,
          requests,
        };
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
          directory: roster,
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

/** ── The profile's own actions: park/reinstate, and the reporting manager ── */

export type EmployeeActivateResult =
  | { kind: "activate"; state: "done"; status: string }
  | { kind: "activate"; state: "error"; message: string };

export type EmployeeManagerResult =
  | { kind: "manager"; state: "done"; userId: string; managerId: string | null }
  | { kind: "manager"; state: "error"; message: string };

export type EmployeeProfileActionResult = EmployeeActivateResult | EmployeeManagerResult;

export async function employeeProfileAction({
  request,
  params,
}: ActionFunctionArgs): Promise<EmployeeProfileActionResult> {
  const form = await request.formData();
  const userId = params.userId ?? "";
  if (form.get("intent") === "manager") {
    return saveManager(request, userId, form);
  }
  if (form.get("intent") !== "activate") {
    return {
      kind: "activate",
      state: "error",
      message: "We could not understand this request. Please try again.",
    };
  }
  const active = form.get("active") === "true";
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    const result = await setMemberActive(token, userId, active, request.signal);
    return { kind: "activate", state: "done", status: result.status };
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
        return { kind: "activate", state: "error", message: errBody.message };
      }
    }
    return { kind: "activate", state: "error", message: messageForError(error) };
  }
}

/** The manager save (Epic 24, CAP-6): "" clears the pointer, an id assigns.
 *  Every refusal is mapped by `error_code` — the four tree codes have their
 *  own sentences, so the dialog never shows a developer message. */
async function saveManager(
  request: Request,
  userId: string,
  form: FormData,
): Promise<EmployeeManagerResult> {
  const raw = form.get("managerId");
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (
    trimmed !== "" &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
  ) {
    return {
      kind: "manager",
      state: "error",
      message: "Please choose a reporting manager from the list.",
    };
  }
  const managerId = trimmed === "" ? null : trimmed;
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    await setManager(token, userId, managerId, request.signal);
    return { kind: "manager", state: "done", userId, managerId };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { kind: "manager", state: "error", message: messageForError(error) };
  }
}
