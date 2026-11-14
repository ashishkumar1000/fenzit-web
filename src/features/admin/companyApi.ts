import { apiFetch } from "../../services/api";

/**
 * Clients for the owner's Company section. Every endpoint already exists and
 * is granted to company_admin by the roles spec — this file only types the
 * parts of each response the console renders.
 */

export interface PulseCounts {
  tracked: number;
  checkedIn: number;
  notCheckedIn: number;
  shortDay: number;
  late: number;
  onLeave: number;
}

export interface PulseResponse {
  date: string;
  counts: PulseCounts;
  flags: { checkoutMissing: unknown[]; fakeLocationAttempt: unknown[] };
}

export interface MemberRow {
  userId: string;
  name: string | null;
  countryCode: string;
  phoneNumber: string;
  employeeCode: string;
  role: string;
  status: "invited" | "active" | "removed";
  createdAt: string;
  /** Job switches (Epic 22, CAP-1) — meaningful for employees. */
  canCreateJobs: boolean;
  jobApprovalRequired: boolean;
}

/**
 * Set one employee's two job switches (CAP-1). A change applies to the next
 * job the employee creates — jobs already pending keep their state.
 */
export function updateJobSettings(
  token: string,
  userId: string,
  settings: { canCreateJobs: boolean; jobApprovalRequired: boolean },
  signal?: AbortSignal,
): Promise<void> {
  return apiFetch<void>(`/api/v1/members/${encodeURIComponent(userId)}/job-settings`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(settings),
    signal,
  });
}

export interface LeaveRow {
  id: string;
  employeeName?: string;
  employeeCode?: string;
  startDate: string;
  endDate: string;
  part: string;
  reason: string;
  status: string;
  workingDays: number;
  totalDays: number;
}

export interface AuditRow {
  id: string;
  createdAt: string;
  actorUserId: string;
  actorIsPlatformAdmin: boolean;
  action: string;
  targetUserId: string | null;
}

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function fetchPulse(token: string, signal?: AbortSignal): Promise<PulseResponse> {
  return apiFetch<PulseResponse>("/api/v1/attendance/dashboard", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export function fetchMembers(token: string, signal?: AbortSignal): Promise<MemberRow[]> {
  return apiFetch<MemberRow[]>("/api/v1/members", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export function fetchCompanyLeave(token: string, signal?: AbortSignal): Promise<Page<LeaveRow>> {
  return apiFetch<Page<LeaveRow>>("/api/v1/attendance/leave?limit=8", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export function fetchAudit(token: string, signal?: AbortSignal): Promise<AuditRow[]> {
  return apiFetch<AuditRow[]>("/api/v1/audit-log?limit=8", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** ── The owner's full-list drill-downs (existing endpoints) ─────────── */

export interface CustomerRow {
  id: string;
  name: string;
  countryCode: string;
  phoneNumber: string;
  address: string | null;
  jobCount: number;
  lastJobDate: string | null;
}

export function fetchCustomers(
  token: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<CustomerRow>> {
  const query = cursor === null ? "?limit=25" : `?limit=25&cursor=${encodeURIComponent(cursor)}`;
  return apiFetch<Page<CustomerRow>>(`/api/v1/customers${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** One step of a job's stamped workflow, as the list and detail responses
 *  carry it. The console renders only the label and where it sits. */
export interface WorkflowStep {
  key: string;
  label: string;
  requiresPhoto: boolean;
  requiresSignature: boolean;
  /** The status this step sets when completed ("in_progress"|"completed"|null). */
  setsStatus: string | null;
}

export interface JobRow {
  id: string;
  jobNumber: string;
  status: string;
  priority: string | null;
  scheduledStart: string | null;
  currentStep: string | null;
  skill: { id: string; name: string } | null;
  /** The assignee — the owner reads who a job belongs to from the list. */
  technician: { id: string; name: string | null } | null;
  /** The customer the work is for (name embed; the queue already had it). */
  customer: { id: string; name: string | null } | null;
  /** The work itself, as the creator described it. */
  description: string | null;
  serviceLocation: string;
  completedAt: string | null;
  createdAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
  /** 0-based position of current_step in the template's chain; null on a
   *  fresh job that has not started. */
  currentStepIndex: number | null;
  workflowTemplate: { version: number; steps: WorkflowStep[] } | null;
}

/**
 * The jobs list endpoint slices by timeline (today/upcoming/overdue/history)
 * and paginates within one — no single "all jobs" scope exists. The
 * drill-down therefore merges the first page of every scope and sorts by
 * schedule, newest first. A `status` filter (the table's chips) skips the
 * merge: `scope=all&status=…` is one call, newest-created first.
 */
export async function fetchJobs(
  token: string,
  signal?: AbortSignal,
  status?: string,
): Promise<JobRow[]> {
  if (status !== undefined && status !== "") {
    const page = await apiFetch<Page<JobRow>>(
      `/api/v1/jobs?scope=all&status=${encodeURIComponent(status)}&limit=50`,
      { headers: { Authorization: `Bearer ${token}` }, signal },
    );
    return page.data;
  }
  const scopes = ["today", "upcoming", "overdue", "history"] as const;
  const pages = await Promise.all(
    scopes.map((scope) =>
      apiFetch<Page<JobRow>>(`/api/v1/jobs?scope=${scope}&limit=25`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }),
    ),
  );
  const seen = new Set<string>();
  const merged: JobRow[] = [];
  for (const page of pages) {
    for (const job of page.data) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      merged.push(job);
    }
  }
  return merged.sort((a, b) => ((b.scheduledStart ?? "") < (a.scheduledStart ?? "") ? -1 : 1));
}

export interface HolidayRow {
  id: string;
  date: string;
  name: string;
}

export function fetchHolidays(token: string, signal?: AbortSignal): Promise<HolidayRow[]> {
  return apiFetch<HolidayRow[]>("/api/v1/attendance/holidays", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export interface MonthlyEmployeeRow {
  employeeId: string;
  employeeName: string;
  officeName: string | null;
  summary: {
    daysWorked: number;
    halfDays: number;
    lateCount: number;
    leave: number;
    weeklyOffs: number;
    holidays: number;
    workedOnHoliday: number;
    absent: number;
    checkoutMissing: number;
  };
}

export function fetchMonthly(
  token: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<{ from: string; to: string; employees: MonthlyEmployeeRow[] }> {
  return apiFetch<{ from: string; to: string; employees: MonthlyEmployeeRow[] }>(
    `/api/v1/attendance/monthly?from=${from}&to=${to}`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
}
