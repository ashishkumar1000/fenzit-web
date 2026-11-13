import { redirect, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import type { LeaveRow } from "./companyApi";
import {
  fetchMyJobs,
  fetchMyLeave,
  fetchMyMonthly,
  fetchMyRejectedJobs,
  fetchMySummary,
  type JobRow,
  type MeMonthSummary,
  type MeSummary,
  type RejectedJobRow,
} from "./meApi";
import { fetchEmployeeReport, type EmployeeReportResponse } from "./jobReportsApi";
import { fetchMyPendingJobs } from "./myJobsApi";
import type { ApprovalQueueItem } from "./approvalApi";
import { istEndOfLastMonth, istFirstOfMonth, istShifted, istToday } from "./format";
import { settle, type Slice } from "./slice";

/** The Me section's profile line — the caller's own /users/me row, which the
 *  loader already fetched for the role gate. No members read here: GET
 *  /members needs member.read, which employees and viewers do not hold. */
export interface MeProfile {
  name: string | null;
  email: string | null;
  countryCode: string;
  phoneNumber: string;
  employeeCode: string | null;
  role: string | null;
  status: string | null;
}

export type MeData =
  | {
      state: "ok";
      me: MeProfile;
      summary: Slice<MeSummary>;
      month: Slice<MeMonthSummary>;
      leave: Slice<LeaveRow[]>;
      jobs: Slice<JobRow[]>;
      /** My created-job outcomes for the chosen period (Epic 22, CAP-8). */
      report: Slice<EmployeeReportResponse>;
      /** Which activity preset is current — the toggle highlights it. */
      reportPreset: string;
      /** My rejected jobs, all time (CAP-7) — no expiry. */
      rejected: Slice<RejectedJobRow[]>;
      /** More rejected pages exist; `rejectedNext` is the cursor to walk. */
      rejectedMore: boolean;
      rejectedNext: string | null;
      /** My submissions waiting for the owner (CAP-4), oldest first. */
      pending: Slice<ApprovalQueueItem[]>;
      /** More pending submissions exist beyond this page. */
      pendingMore: boolean;
      /** My own job switches (CAP-1) — display truth for the New job link. */
      canCreateJobs: boolean;
      jobApprovalRequired: boolean;
    }
  | { state: "failed" };

/**
 * Loader for /admin/me — an employee's (or viewer's) own section. Only
 * own-scope endpoints are called, so the page cannot show anyone else's data.
 */
export async function adminMeLoader({ request }: LoaderFunctionArgs): Promise<MeData> {
  try {
    const { token, me } = await requireConsoleRole(request, ["member"]);
    const url = new URL(request.url);
    // The activity period and the rejected-history page ride the URL so both
    // toggles are plain navigation: the loader refetches, the page never
    // holds server data. Windows are IST days — the server computes them so.
    const preset = url.searchParams.get("range") ?? "";
    const today = istToday();
    const range: { from: string; to: string } = (() => {
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
    })();
    const rejectedCursor = url.searchParams.get("rejectedCursor") ?? undefined;
    const from = `${today.slice(0, 7)}-01`;
    const KNOWN_PRESETS = new Set(["", "today", "7", "30", "this-month", "last-month"]);
    const [summary, month, leave, jobs, report, rejectedPage, pendingPage] = await Promise.all([
      settle(() => fetchMySummary(token, request.signal)),
      settle(() => fetchMyMonthly(token, from, today, request.signal)),
      settle(async () => (await fetchMyLeave(token, request.signal)).data),
      settle(async () => (await fetchMyJobs(token, request.signal)).data),
      settle(() => fetchEmployeeReport(token, range, request.signal)),
      settle(() => fetchMyRejectedJobs(token, rejectedCursor, request.signal)),
      settle(() => fetchMyPendingJobs(token, request.signal)),
    ]);
    return {
      state: "ok",
      me: {
        name: me.name,
        email: me.email,
        countryCode: me.countryCode ?? "+91",
        phoneNumber: me.phoneNumber ?? "",
        employeeCode: me.employeeCode,
        role: me.role,
        status: me.status,
      },
      summary,
      month,
      leave,
      jobs,
      report,
      reportPreset: preset !== "" && KNOWN_PRESETS.has(preset) ? preset : "30",
      rejected: rejectedPage.ok ? { ok: true, data: rejectedPage.data.data } : { ok: false },
      rejectedMore: rejectedPage.ok ? rejectedPage.data.hasMore : false,
      rejectedNext: rejectedPage.ok ? rejectedPage.data.nextCursor : null,
      pending: pendingPage.ok ? { ok: true, data: pendingPage.data.data } : { ok: false },
      pendingMore: pendingPage.ok ? pendingPage.data.hasMore : false,
      canCreateJobs: me.canCreateJobs ?? false,
      jobApprovalRequired: me.jobApprovalRequired ?? false,
    };
  } catch (error) {
    // A redirect thrown deeper down (wrong role, dead session) is navigation.
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed" };
  }
}
