import { redirect } from "react-router";
import { clearSession } from "../../services/session";
import { isAuthError } from "./adminLoader";
import { fetchMembers, type MemberRow } from "./companyApi";
import { settle, type Slice } from "./slice";
import { istToday } from "./format";
import { fetchMonthStatus } from "./payrollApi";
import type { PayrollMonthStatusView } from "./payrollViews";
import {
  fetchMonthLock,
  fetchOffCycleLines,
  fetchPayrollAudit,
  fetchRuns,
  type AuditEntryView,
  type LockView,
  type OffCycleLineView,
  type PayrollRunView,
} from "./payrollRunApi";
import type { PayrollTab } from "./payrollLoaders";

/**
 * The runs/audit tabs' data. One GET /payroll/runs serves both the month's
 * run lookup and the history (the BE answers the newest 50); the month
 * defaults to the newest run's month — the lock/summary work — and falls
 * back to the current month on a fresh company. The lock confirmation is
 * fetched for a locked month (the BE 404s an unlocked one; that maps to
 * null). Off-cycle staging WRITES are deferred (they need the membership
 * row id no shipped members surface carries); the lines render read-only.
 */

export type PayrollRunTabData =
  | {
      state: "ok";
      tab: "runs";
      month: string;
      monthStatus: Slice<PayrollMonthStatusView>;
      /** The chosen month's newest run, or null when it never ran. */
      run: PayrollRunView | null;
      /** That run is still "running" past the stale window — offer the
       *  reclaiming re-run. */
      runStale: boolean;
      history: PayrollRunView[];
      lock: Slice<LockView | null>;
      offCycleLines: Slice<OffCycleLineView[]>;
      /** The team for the override dialog. */
      members: Slice<MemberRow[]>;
    }
  | {
      state: "ok";
      tab: "audit";
      entries: Slice<AuditEntryView[]>;
      members: Slice<MemberRow[]>;
    };

const MONTH_SHAPE = /^\d{4}-(?:0[1-9]|1[0-2])$/;

/** A run still "running" past this long means the executor died — the
 *  BE's stale reclaim fires when the month is re-POSTed. Computed in the
 *  loader: render stays free of clock reads. */
const STALE_RUNNING_MS = 15 * 60 * 1000;

/** Shared failure shape for the run tabs (the page loader's own catch
 *  handles session loss above this). */
export type RunTabFail = { state: "failed"; tab: PayrollTab };

export async function loadRunsTab(
  request: Request,
  token: string,
  tab: PayrollTab,
): Promise<PayrollRunTabData | RunTabFail> {
  const params = new URL(request.url).searchParams;
  const requested = params.get("month") ?? "";
  try {
    const history = await fetchRuns(token, request.signal);
    const month = MONTH_SHAPE.test(requested)
      ? requested
      : (history[0]?.month ?? istToday().slice(0, 7));
    const run = history.find((r) => r.month === month) ?? null;
    const runStale =
      run !== null &&
      run.status === "running" &&
      run.startedAt !== null &&
      Date.now() - new Date(run.startedAt).getTime() > STALE_RUNNING_MS;
    const [monthStatus, lock, offCycleLines, members] = await Promise.all([
      settle(() => fetchMonthStatus(token, month, request.signal)),
      settle(() => fetchMonthLock(token, month, request.signal)),
      settle(() => fetchOffCycleLines(token, month, request.signal)),
      settle(() => fetchMembers(token, request.signal)),
    ]);
    return {
      state: "ok",
      tab: "runs",
      month,
      monthStatus,
      run,
      runStale,
      history,
      lock,
      offCycleLines,
      members,
    };
  } catch (error) {
    return runTabFailure(error, request, tab);
  }
}

export async function loadAuditTab(
  request: Request,
  token: string,
  tab: PayrollTab,
): Promise<PayrollRunTabData | RunTabFail> {
  try {
    const [entries, members] = await Promise.all([
      settle(() => fetchPayrollAudit(token, request.signal)),
      settle(() => fetchMembers(token, request.signal)),
    ]);
    return { state: "ok", tab: "audit", entries, members };
  } catch (error) {
    return runTabFailure(error, request, tab);
  }
}

/** Session loss redirects (the outer loader's contract), aborts stay quiet,
 *  anything else is the tab's failed state. */
function runTabFailure(error: unknown, request: Request, tab: PayrollTab): RunTabFail {
  if (error instanceof Response) throw error;
  if (isAuthError(error)) {
    clearSession();
    throw redirect("/login");
  }
  if (request.signal.aborted) throw error;
  return { state: "failed", tab };
}
