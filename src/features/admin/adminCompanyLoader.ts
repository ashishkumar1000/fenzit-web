import { redirect, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { fetchOwnerReport, type OwnerReportResponse, type ReportRange } from "./jobReportsApi";
import {
  fetchCompanyLeave,
  fetchMembers,
  fetchPulse,
  type LeaveRow,
  type MemberRow,
  type PulseResponse,
} from "./companyApi";
import { istEndOfLastMonth, istFirstOfMonth, istShifted, istToday } from "./format";
import { settle, type Slice } from "./slice";

export type CompanyData =
  | {
      state: "ok";
      pulse: Slice<PulseResponse>;
      members: Slice<MemberRow[]>;
      leave: Slice<LeaveRow[]>;
      report: Slice<OwnerReportResponse>;
      /** The report window resolved from the address — the card's meta line. */
      range: ReportRange;
      validUntil: string | null;
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
      return { from: istShifted(-29), to: today };
    }
    default:
      return { from: istShifted(-29), to: today };
  }
}

/**
 * Loader for /admin/company (owners only) — the console's single overview:
 * today's pulse, the job report (the old /admin dashboard merged in), the
 * leave list and the subscription line, fetched together; each section
 * settles on its own so one failure never blanks the page.
 */
export async function adminCompanyLoader({ request }: LoaderFunctionArgs): Promise<CompanyData> {
  try {
    const { token, me } = await requireConsoleRole(request, ["owner"]);
    const range = ownerRange(new URL(request.url));
    const [pulse, members, leave, report] = await Promise.all([
      settle(() => fetchPulse(token, request.signal)),
      settle(() => fetchMembers(token, request.signal)),
      settle(async () => (await fetchCompanyLeave(token, request.signal)).data),
      settle(() => fetchOwnerReport(token, range, request.signal)),
    ]);
    return {
      state: "ok",
      pulse,
      members,
      leave,
      report,
      range,
      validUntil: me.subscription?.validUntil ?? null,
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
