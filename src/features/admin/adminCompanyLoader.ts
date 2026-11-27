import { redirect, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import {
  fetchOwnerExecReport,
  type OwnerExecReportResponse,
  type ReportRange,
} from "./jobReportsApi";
import { fetchAttendanceTrend, type AttendanceTrendResponse } from "./companyApi";
import { istEndOfLastMonth, istFirstOfMonth, istShifted, istToday } from "./format";
import { settle, type Slice } from "./slice";

/** The banner's plan facts (tenants columns via /users/me; the BE defaults
 *  them, the FE defaults them again so an older backend never blanks the
 *  banner). */
export interface SubscriptionFacts {
  validUntil: string | null;
  planName: string;
  billingCycle: string;
  autoRenews: boolean;
}

export type CompanyData =
  | {
      state: "ok";
      /** The exec dashboard's job-flow + workforce sections (2026-11-27). */
      report: Slice<OwnerExecReportResponse>;
      /** The daily attendance distribution behind the trend chart. */
      trend: Slice<AttendanceTrendResponse>;
      /** The report window resolved from the address — every card's meta. */
      range: ReportRange;
      subscription: SubscriptionFacts;
      /** The signed-in owner's display name for the greeting. */
      selfName: string | null;
    }
  | { state: "failed" };

/** The job report's window, resolved from the URL's `?range=` preset (moved
 *  here with the report when the dashboard merged into this page). Every
 *  window is built on IST days — that is how the server computes the report —
 *  so a browser in another timezone still matches the server's day
 *  boundaries. */
export function ownerRange(url: URL): { from: string; to: string } {
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
      return { from: istShifted(-6), to: today };
    }
    // The default is the 7-day window (owner call, 2026-11-27): the smaller
    // range keeps the three chart reads light, and a longer period is one
    // preset click away.
    default:
      return { from: istShifted(-6), to: today };
  }
}

/**
 * Loader for /admin/company (owners only) — the 2026-11-27 executive
 * dashboard: the subscription banner's facts from the identity read, the
 * owner report (job-flow trend + workforce buckets) and the attendance
 * trend, fetched together; the two chart slices settle on their own so one
 * failure never blanks the page. The pulse and member reads are gone — the
 * revamped page renders charts, not tiles and tables.
 */
export async function adminCompanyLoader({ request }: LoaderFunctionArgs): Promise<CompanyData> {
  try {
    const { token, me } = await requireConsoleRole(request, ["owner"]);
    const range = ownerRange(new URL(request.url));
    const [report, trend] = await Promise.all([
      settle(() => fetchOwnerExecReport(token, range, request.signal)),
      settle(() => fetchAttendanceTrend(token, range, request.signal)),
    ]);
    return {
      state: "ok",
      report,
      trend,
      range,
      subscription: {
        validUntil: me.subscription?.validUntil ?? null,
        planName: me.subscription?.planName ?? "Enterprise",
        billingCycle: me.subscription?.billingCycle ?? "Annual",
        autoRenews: me.subscription?.autoRenews ?? true,
      },
      selfName: me.name,
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
