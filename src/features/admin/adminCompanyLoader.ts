import { redirect, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import {
  fetchAudit,
  fetchCompanyLeave,
  fetchMembers,
  fetchPulse,
  type AuditRow,
  type LeaveRow,
  type MemberRow,
  type PulseResponse,
} from "./companyApi";
import { settle, type Slice } from "./slice";

export type CompanyData =
  | {
      state: "ok";
      pulse: Slice<PulseResponse>;
      members: Slice<MemberRow[]>;
      leave: Slice<LeaveRow[]>;
      audit: Slice<AuditRow[]>;
    }
  | { state: "failed" };

/**
 * Loader for /admin/company (owners only). Four existing company-scoped
 * endpoints, fetched together; each section settles on its own so one
 * failure never blanks the page.
 */
export async function adminCompanyLoader({ request }: LoaderFunctionArgs): Promise<CompanyData> {
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    const [pulse, members, leave, audit] = await Promise.all([
      settle(() => fetchPulse(token, request.signal)),
      settle(() => fetchMembers(token, request.signal)),
      settle(async () => (await fetchCompanyLeave(token, request.signal)).data),
      settle(() => fetchAudit(token, request.signal)),
    ]);
    return { state: "ok", pulse, members, leave, audit };
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
