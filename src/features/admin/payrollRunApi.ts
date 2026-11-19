import { ApiError, apiFetch } from "../../services/api";

/**
 * Clients for the payroll RUN surfaces (epic 23, stories 6/7/9 — all
 * shipped, all `payroll.config`, company admin alone). Types here mirror
 * the BE's views exactly; the money fields arrive as 2dp text and stay
 * text until render. The off-cycle staging WRITES need the membership row
 * id, which no shipped members surface exposes — until the BE carries it,
 * this file is read-only for off-cycle lines.
 */

/** ── Run lifecycle (23-6) ─────────────────────────────────────────────── */

export type PayrollRunStatus = "queued" | "running" | "completed" | "failed";

export interface RunSkip {
  employee: string;
  /** missing_join_date | not_configured | empty_window | never_enrolled. */
  reason: string;
  /** The BE's own plain-English sentence — rendered verbatim. */
  detail: string;
}

export interface RunSummary {
  month: string;
  employees: number;
  payslips: number;
  skips: RunSkip[];
  warnings: string[];
  offCycle: {
    staged: number;
    applied: number;
    orphaned: Array<{ employee: string; label: string; amount: string }>;
  };
  recovery: {
    outstandingBefore: string;
    outstandingAfter: string;
    raisedThisRun: string;
  };
  // The BE also stores the month's policy in the summary (divisor /
  // cutoff_day / pay_date, snake_case, omitted on the zero-employee path) —
  // the page takes that copy from the month status instead, so the fields
  // stay unmirrored here.
  /** Only the zero-employee completion carries this marker. */
  status?: "no_employees";
}

export interface PayrollRunView {
  id: string;
  month: string;
  status: PayrollRunStatus;
  summary: RunSummary | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

/** Trigger one month's run. The BE answers 202 with the queued (or
 *  idempotently re-served in-flight) run; failures are terminal-and-
 *  retryable by posting the same month again. */
export function triggerRun(
  token: string,
  month: string,
  signal?: AbortSignal,
): Promise<PayrollRunView> {
  return apiFetch<PayrollRunView>("/api/v1/payroll/runs", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ month }),
    signal,
  });
}

export function fetchRuns(token: string, signal?: AbortSignal): Promise<PayrollRunView[]> {
  return apiFetch<PayrollRunView[]>("/api/v1/payroll/runs", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** ── Lock (23-7) ──────────────────────────────────────────────────────── */

export interface LockView {
  month: string;
  lockedAt: string;
  lockedBy: string;
  confirmation: {
    statement: string;
    permanence: string;
    remedy: string;
    stagedOffCycleLines: Array<{ employee: string; label: string; amount: string; tag: string }>;
  };
}

/** Permanently lock a completed month. There is no unlock. */
export function lockMonth(token: string, month: string, signal?: AbortSignal): Promise<LockView> {
  return apiFetch<LockView>(`/api/v1/payroll/months/${encodeURIComponent(month)}/lock`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
    signal,
  });
}

/** The confirmation of an already-locked month; 404 while unlocked. */
export function fetchMonthLock(
  token: string,
  month: string,
  signal?: AbortSignal,
): Promise<LockView | null> {
  return apiFetch<LockView>(`/api/v1/payroll/months/${encodeURIComponent(month)}/lock`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  }).catch((error: unknown) => {
    // The BE 404s an unlocked month — that is an answer, not a failure.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });
}

/** ── Statutory override (23-6/23-9) ───────────────────────────────────── */

export interface RunOverrideView {
  month: string;
  field: "pf_employee" | "tds";
  amount: string;
  updatedAt: string;
}

/** The employee rides the PATH (user id — memberships.user_id), the amount
 *  is digits-only money text, and the employer-liability acknowledgment
 *  must be literal true. */
export function saveRunOverride(
  token: string,
  userId: string,
  body: {
    month: string;
    field: "pf_employee" | "tds";
    amount: string;
    acknowledgedLiability: boolean;
  },
  signal?: AbortSignal,
): Promise<RunOverrideView> {
  return apiFetch<RunOverrideView>(
    `/api/v1/payroll/employees/${encodeURIComponent(userId)}/run-override`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    },
  );
}

/** ── Off-cycle lines (23-9) — READ ONLY until the BE exposes the
 *  memberships.id the write DTOs key on ───────────────────────────────── */

export interface OffCycleLineView {
  id: string;
  membershipId: string;
  employeeName: string | null;
  month: string;
  label: string;
  /** Signed number: positive earning, negative recovery. */
  amount: number;
  tag: "wage" | "bonus";
  status: "staged" | "applied";
  createdAt: string;
}

export function fetchOffCycleLines(
  token: string,
  month: string,
  signal?: AbortSignal,
): Promise<OffCycleLineView[]> {
  return apiFetch<OffCycleLineView[]>(
    `/api/v1/payroll/off-cycle-lines?month=${encodeURIComponent(month)}`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
}

/** ── Audit (23-7) ─────────────────────────────────────────────────────── */

export interface AuditEntryView {
  id: string;
  createdAt: string;
  actorId: string;
  action: string;
  targetUserId: string | null;
  details: Record<string, unknown>;
}

export function fetchPayrollAudit(token: string, signal?: AbortSignal): Promise<AuditEntryView[]> {
  return apiFetch<AuditEntryView[]>("/api/v1/payroll/audit", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}
