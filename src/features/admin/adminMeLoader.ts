import { redirect, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import type { LeaveRow } from "./companyApi";
import {
  fetchMyLeave,
  fetchMyMonthly,
  fetchMySummary,
  type MeMonthSummary,
  type MeSummary,
} from "./meApi";
import { istToday } from "./format";
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
    }
  | { state: "failed" };

/**
 * Loader for /admin/me — an employee's (or viewer's) own section. Only
 * own-scope endpoints are called, so the page cannot show anyone else's data.
 * The job panels moved to the shared jobs page (adminJobsLoader); Me keeps
 * attendance, the month summary and leave.
 */
export async function adminMeLoader({ request }: LoaderFunctionArgs): Promise<MeData> {
  // Old Me-page report and rejected deep links: those panels moved to the
  // shared jobs page (2026-11-14 tabs), so carry the address over instead of
  // silently ignoring it.
  const old = new URL(request.url).searchParams;
  if (old.has("range") || old.has("rejectedCursor")) {
    const carried = new URLSearchParams(old);
    carried.set("tab", carried.has("rejectedCursor") ? "rejected" : "report");
    throw redirect(`/admin/company/jobs?${carried.toString()}`);
  }
  try {
    const { token, me } = await requireConsoleRole(request, ["member"]);
    const today = istToday();
    const from = `${today.slice(0, 7)}-01`;
    const [summary, month, leave] = await Promise.all([
      settle(() => fetchMySummary(token, request.signal)),
      settle(() => fetchMyMonthly(token, from, today, request.signal)),
      settle(async () => (await fetchMyLeave(token, request.signal)).data),
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
