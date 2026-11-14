import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { consoleRole, isAuthError, requireConsoleRole } from "./adminLoader";
import { messageForError } from "../../utils/errorMessages";
import { loadApprovalQueueState, type QueueState } from "./approvalLoaders";
import {
  fetchCustomers,
  fetchHolidays,
  fetchJobs,
  fetchMembers,
  fetchMonthly,
  updateJobSettings,
  type CustomerRow,
  type HolidayRow,
  type JobRow,
  type MemberRow,
  type MonthlyEmployeeRow,
} from "./companyApi";
import { fetchMyPendingJobs } from "./myJobsApi";
import { fetchMyRejectedJobs, type RejectedJobRow } from "./meApi";
import {
  fetchEmployeeReport,
  fetchOwnerReport,
  type EmployeeReportResponse,
  type OwnerPipeline,
} from "./jobReportsApi";
import { fetchNotifications, type NotificationRow } from "./notificationsApi";
import { fetchReportHistory, type ReportHistoryRow, type RosterPerson } from "./jobExportApi";
import type { ApprovalQueueItem } from "./approvalApi";
import { istEndOfLastMonth, istFirstOfMonth, istShifted, istToday, fmtPhone } from "./format";
import { settle, type Slice } from "./slice";

/**
 * Loaders for the owner's full-list pages. Every endpoint already exists and
 * is granted to company_admin; each page settles on its own so a failure is
 * a retry line, never a blank screen.
 */

export type BrowseFail = { state: "failed" };

function isoToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

export type CustomersData =
  | {
      state: "ok";
      rows: CustomerRow[];
      nextCursor: string | null;
      requested: string | null;
    }
  | BrowseFail;

export async function adminCustomersLoader({
  request,
}: LoaderFunctionArgs): Promise<CustomersData> {
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    const requested = new URL(request.url).searchParams.get("cursor");
    const page = await fetchCustomers(token, requested, request.signal);
    return { state: "ok", rows: page.data, nextCursor: page.nextCursor, requested };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed" };
  }
}

/** The jobs page's tabs. The page's panels each live on one tab, and the
 *  loader fetches only the active tab's data — a tab change is navigation,
 *  so nothing the user is not looking at is asked of the backend. */
export type JobsTab = "jobs" | "approval" | "activity" | "report" | "rejected";

/** One tab's data, per role. Every variant carries `role` and `tab` so the
 *  page can render the tab strip even on a failed load. */
export type JobsData =
  | { state: "failed"; role: "owner" | "member"; tab: JobsTab }
  | {
      state: "ok";
      role: "owner";
      tab: "jobs";
      rows: JobRow[];
      status: string;
      pipeline: Slice<OwnerPipeline>;
    }
  | {
      state: "ok";
      role: "owner";
      tab: "approval";
      queue: Slice<QueueState>;
      /** Fetched on every owner tab so the Approval tab can badge its
       *  waiting count without opening it. */
      pipeline: Slice<OwnerPipeline>;
    }
  | {
      state: "ok";
      role: "owner";
      tab: "activity";
      activity: Slice<NotificationRow[]>;
      pipeline: Slice<OwnerPipeline>;
    }
  | {
      state: "ok";
      role: "owner";
      tab: "report";
      history: Slice<ReportHistoryRow[]>;
      employees: Slice<RosterPerson[]>;
      pipeline: Slice<OwnerPipeline>;
    }
  | {
      state: "ok";
      role: "member";
      tab: "jobs";
      rows: JobRow[];
      status: string;
      canCreateJobs: boolean;
      jobApprovalRequired: boolean;
      pending: Slice<ApprovalQueueItem[]>;
      pendingMore: boolean;
    }
  | {
      state: "ok";
      role: "member";
      tab: "report";
      report: Slice<EmployeeReportResponse>;
      reportPreset: string;
    }
  | {
      state: "ok";
      role: "member";
      tab: "rejected";
      rejected: Slice<RejectedJobRow[]>;
      rejectedMore: boolean;
      rejectedNext: string | null;
      /** The activity period, kept for the rejected-history's paging link. */
      reportPreset: string;
    }
  | { state: "ok"; role: "member"; tab: "activity"; activity: Slice<NotificationRow[]> };

/** The tab a jobs-page address names — the first tab when the address is
 *  bare. Old deep links keep working: the queue's own params imply the
 *  approval tab, the member report's period implies the report tab, and the
 *  rejected history's cursor implies the rejected tab. */
function resolveJobsTab(request: Request, isOwner: boolean): JobsTab {
  const params = new URL(request.url).searchParams;
  const OWNER_TABS = new Set(["jobs", "approval", "activity", "report"]);
  const MEMBER_TABS = new Set(["jobs", "report", "rejected", "activity"]);
  const requested = params.get("tab") ?? "";
  if (isOwner && OWNER_TABS.has(requested)) return requested as JobsTab;
  if (!isOwner && MEMBER_TABS.has(requested)) return requested as JobsTab;
  const implies: Array<[string, JobsTab]> = isOwner
    ? [
        ["edit", "approval"],
        ["employeeId", "approval"],
        ["olderThan", "approval"],
        ["cursor", "approval"],
      ]
    : [
        // The rejected cursor before the range: a link may carry both (the
        // rejected history keeps the activity period beside its cursor), and
        // the cursor is the more specific intent.
        ["rejectedCursor", "rejected"],
        ["range", "report"],
      ];
  for (const [key, tab] of implies) {
    if (params.has(key)) return tab;
  }
  return "jobs";
}

/** The member activity window, resolved from the URL's `?range=` preset —
 *  the same presets the report page and the Me page used. IST days, as the
 *  server computes them. */
function memberRange(preset: string): { from: string; to: string } {
  const today = istToday();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7":
      return { from: istShifted(-6), to: today };
    case "this-month":
      return { from: istFirstOfMonth(), to: today };
    case "last-month":
      return { from: istFirstOfMonth(-1), to: istEndOfLastMonth() };
    default:
      return { from: istShifted(-29), to: today };
  }
}

const KNOWN_PRESETS = new Set(["", "today", "7", "30", "this-month", "last-month"]);

/** The member's activity preset from the URL — the toggle highlights it. */
function memberPreset(request: Request): string {
  const preset = new URL(request.url).searchParams.get("range") ?? "";
  return preset !== "" && KNOWN_PRESETS.has(preset) ? preset : "30";
}

// The one jobs page for owner and member alike: the owner sees the company's
// jobs with the approval queue, activity feed and report on their own tabs; a
// member sees their own jobs (the server self-scopes `job.read_own`) with
// their report and rejected history on theirs. Only the active tab's data is
// fetched — a tab change is navigation, and the loader follows the address.
// The page's action is the queue's: decide (approve/reject) and save an edit
// — members post nothing to this page.
export { approvalQueueAction as adminJobsAction } from "./approvalLoaders";

/** The owner pipeline over the last 30 IST days — the jobs tab's strip, and
 *  the Approval tab's waiting badge on every owner tab. */
async function ownerPipeline(token: string, signal?: AbortSignal): Promise<Slice<OwnerPipeline>> {
  const pipeline = await settle(() =>
    fetchOwnerReport(token, { from: istShifted(-29), to: istToday() }, signal),
  );
  return pipeline.ok ? { ok: true, data: pipeline.data.pipeline } : { ok: false };
}

export async function adminJobsLoader({ request }: LoaderFunctionArgs): Promise<JobsData> {
  // Remembered for the catch: a failed load still carries the real role, so
  // the page renders the right tab strip instead of guessing the owner's.
  let known: Awaited<ReturnType<typeof requireConsoleRole>> | null = null;
  try {
    const { token, me } = await requireConsoleRole(request, ["owner", "member"]);
    known = { token, me };
    // The table's status chip rides the URL (`?status=scheduled`); "" is All.
    const KNOWN_STATUSES = new Set([
      "",
      "scheduled",
      "in_progress",
      "completed",
      "cancelled",
      "pending_approval",
      "rejected",
    ]);
    const requested = new URL(request.url).searchParams.get("status") ?? "";
    const status = KNOWN_STATUSES.has(requested) ? requested : "";
    const role = consoleRole(me) === "member" ? "member" : "owner";
    const tab = resolveJobsTab(request, role === "owner");
    switch (tab) {
      case "approval": {
        const [queue, pipeline] = await Promise.all([
          settle(() => loadApprovalQueueState(request, token)),
          ownerPipeline(token, request.signal),
        ]);
        return { state: "ok", role: "owner", tab, queue, pipeline };
      }
      case "activity": {
        if (role === "owner") {
          const [activity, pipeline] = await Promise.all([
            settle(() => fetchNotifications(token, request.signal)),
            ownerPipeline(token, request.signal),
          ]);
          return { state: "ok", role, tab, activity, pipeline };
        }
        const activity = await settle(() => fetchNotifications(token, request.signal));
        return { state: "ok", role, tab, activity };
      }
      case "report": {
        if (role === "owner") {
          const [history, employees, pipeline] = await Promise.all([
            settle(() => fetchReportHistory(token, request.signal)),
            settle(async () => {
              const roster = await fetchMembers(token, request.signal);
              return roster
                .filter((m) => m.status === "active" && m.name !== null)
                .map((m): RosterPerson => ({
                  id: m.userId,
                  name: m.name ?? "",
                  phone: fmtPhone(m.countryCode, m.phoneNumber),
                  employeeCode: m.employeeCode ?? "",
                }));
            }),
            ownerPipeline(token, request.signal),
          ]);
          return { state: "ok", role, tab, history, employees, pipeline };
        }
        const report = await settle(() =>
          fetchEmployeeReport(token, memberRange(memberPreset(request)), request.signal),
        );
        return { state: "ok", role, tab, report, reportPreset: memberPreset(request) };
      }
      case "rejected": {
        const rejectedCursor = new URL(request.url).searchParams.get("rejectedCursor") ?? undefined;
        const rejectedPage = await settle(() =>
          fetchMyRejectedJobs(token, rejectedCursor, request.signal),
        );
        return {
          state: "ok",
          role: "member",
          tab,
          rejected: rejectedPage.ok ? { ok: true, data: rejectedPage.data.data } : { ok: false },
          rejectedMore: rejectedPage.ok ? rejectedPage.data.hasMore : false,
          rejectedNext: rejectedPage.ok ? rejectedPage.data.nextCursor : null,
          reportPreset: memberPreset(request),
        };
      }
      default: {
        if (role === "owner") {
          const [rows, pipeline] = await Promise.all([
            fetchJobs(token, request.signal, status),
            ownerPipeline(token, request.signal),
          ]);
          return {
            state: "ok",
            role,
            tab,
            rows,
            status,
            pipeline,
          };
        }
        const [rows, pendingPage] = await Promise.all([
          fetchJobs(token, request.signal, status),
          settle(() => fetchMyPendingJobs(token, request.signal)),
        ]);
        return {
          state: "ok",
          role,
          tab,
          rows,
          status,
          canCreateJobs: me.canCreateJobs ?? false,
          jobApprovalRequired: me.jobApprovalRequired ?? false,
          pending: pendingPage.ok ? { ok: true, data: pendingPage.data.data } : { ok: false },
          pendingMore: pendingPage.ok ? pendingPage.data.hasMore : false,
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
    // The role here is real whenever /users/me answered — a network hiccup
    // before that leaves the owner guess, which only shapes the tab strip.
    return {
      state: "failed",
      role: known !== null && consoleRole(known.me) === "member" ? "member" : "owner",
      tab: resolveJobsTab(request, known === null || consoleRole(known.me) !== "member"),
    };
  }
}

export type EmployeesData = { state: "ok"; rows: MemberRow[] } | BrowseFail;

export async function adminEmployeesLoader({
  request,
}: LoaderFunctionArgs): Promise<EmployeesData> {
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    return { state: "ok", rows: await fetchMembers(token, request.signal) };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed" };
  }
}

export type JobSettingsResult =
  { state: "done"; userId: string } | { state: "error"; userId: string; message: string };

/** Save one employee's two job switches (Epic 22, CAP-1). The loader
 *  refetches after the action, so the saved values show on the row. */
export async function adminEmployeesAction({
  request,
}: ActionFunctionArgs): Promise<JobSettingsResult> {
  const form = await request.formData();
  const userId = typeof form.get("userId") === "string" ? (form.get("userId") as string) : "";
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    if (userId === "") {
      return { state: "error", userId, message: "That save could not be sent. Try again." };
    }
    await updateJobSettings(
      token,
      userId,
      {
        canCreateJobs: form.get("canCreateJobs") === "on",
        jobApprovalRequired: form.get("jobApprovalRequired") === "on",
      },
      request.signal,
    );
    return { state: "done", userId };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "error", userId, message: messageForError(error) };
  }
}

export type HolidaysData = { state: "ok"; rows: HolidayRow[] } | BrowseFail;

export async function adminHolidaysLoader({ request }: LoaderFunctionArgs): Promise<HolidaysData> {
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    return { state: "ok", rows: await fetchHolidays(token, request.signal) };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed" };
  }
}

export type AttendanceData =
  | { state: "failed"; tab: "month" | "report" }
  | {
      state: "ok";
      tab: "month";
      from: string;
      to: string;
      rows: MonthlyEmployeeRow[];
    }
  | {
      state: "ok";
      tab: "report";
      /** The attendance card's report history (this page's own type). */
      history: Slice<ReportHistoryRow[]>;
    };

/** The attendance page's two tabs — the running month's table, and the
 *  attendance report PDF. Only the active tab's data is fetched. */
export async function adminAttendanceLoader({
  request,
}: LoaderFunctionArgs): Promise<AttendanceData> {
  const tab = new URL(request.url).searchParams.get("tab") === "report" ? "report" : "month";
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    if (tab === "report") {
      const history = await settle(() => fetchReportHistory(token, request.signal));
      return { state: "ok", tab, history };
    }
    const to = isoToday();
    const from = `${to.slice(0, 7)}-01`;
    const month = await fetchMonthly(token, from, to, request.signal);
    return {
      state: "ok",
      tab,
      from: month.from,
      to: month.to,
      rows: month.employees,
    };
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
