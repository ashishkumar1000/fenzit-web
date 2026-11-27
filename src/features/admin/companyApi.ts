import { apiFetch, ApiError } from "../../services/api";
import { getApiBaseUrl } from "../../config/env";

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

/** One step up the reporting tree: the manager's id and their name. */
export interface MemberChainLink {
  userId: string;
  name: string;
}

/**
 * The hierarchy fields every member payload carries (Epic 24, CAP-1). `chain`
 * is nearest-first ("Reports to Priya → Arjun (Owner)"); `headcount` counts
 * everyone strictly below the member, `directReports` the immediate count —
 * the re-parent confirmation needs that one.
 */
export interface MemberHierarchy {
  managerId: string | null;
  managerName: string | null;
  chain: MemberChainLink[];
  headcount: number;
  directReports: number;
}

export interface MemberRow extends MemberHierarchy {
  userId: string;
  name: string | null;
  /** The linked login email, or null — shown under the name in the table. */
  email?: string | null;
  countryCode: string;
  phoneNumber: string;
  employeeCode: string;
  role: string;
  status: "invited" | "active" | "deactivated" | "removed";
  createdAt: string;
  /** Short-lived link to the person's photo, or null. The paged list carries it. */
  avatarUrl?: string | null;
  /** Job switches (Epic 22, CAP-1) — meaningful for employees. */
  canCreateJobs: boolean;
  jobApprovalRequired: boolean;
}

/**
 * Set who a member reports to (Epic 24, CAP-6). `null` clears the pointer and
 * routes their filings to the admins; an admin can never be assigned one.
 */
export function setManager(
  token: string,
  userId: string,
  managerId: string | null,
  signal?: AbortSignal,
): Promise<MemberRow> {
  return apiFetch<MemberRow>(`/api/v1/members/${encodeURIComponent(userId)}/manager`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ managerId }),
    signal,
  });
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

export interface InviteMemberResult {
  /** The new membership's user id — the row the invite points at. */
  inviteId: string;
  /** The employee code the new member got, for example "EMP-006". */
  employeeCode: string;
  /** What happened to the invite SMS: sent, failed, refused_cap or
   *  not_configured. The invite is saved either way. */
  smsStatus: string | null;
}

/** Invite one person to the company (POST /auth/invite): the backend creates
 *  the membership with its employee code and sends the invite SMS. The same
 *  endpoint the mobile app's add-employee screen uses. `managerId` rides only
 *  when chosen — an absent key leaves the new member unassigned. */
export function inviteMember(
  token: string,
  input: { countryCode: string; phoneNumber: string; name: string; managerId?: string },
  signal?: AbortSignal,
): Promise<InviteMemberResult> {
  const body: { countryCode: string; phoneNumber: string; name: string; managerId?: string } = {
    countryCode: input.countryCode,
    phoneNumber: input.phoneNumber,
    name: input.name,
  };
  if (input.managerId !== undefined && input.managerId !== "") body.managerId = input.managerId;
  return apiFetch<{
    invite_id: string;
    employee_code?: string | null;
    sms_status?: string | null;
  }>("/api/v1/auth/invite", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  }).then((row) => ({
    inviteId: row.invite_id,
    employeeCode: row.employee_code ?? "",
    smsStatus: row.sms_status ?? null,
  }));
}

export interface LeaveRow {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  /** Short-lived presign from the same page read — use it, never refetch. */
  employeeAvatarUrl?: string | null;
  /** The request's leave type — absent on legacy rows created before the
   *  fixed catalog; drives the day modal's type pill, count chips and
   *  type filters. */
  leaveTypeId?: string;
  leaveTypeCode?: string;
  leaveTypeName?: string;
  /** The employee's office assignment covering today — the timeline card's
   *  office line; absent when the person has no current office. */
  officeName?: string;
  startDate: string;
  endDate: string;
  part: string;
  reason: string;
  /** Full ISO instant — slice(0, 10) for the day. */
  createdAt: string;
  status: string;
  workingDays: number;
  totalDays: number;
  /** The request's working dates, oldest first, with each day's own state. */
  dates: Array<{ date: string; state: string }>;
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

/** The whole-company counters the Employees page's stat tiles show. They count
 *  the team before any filter, so the tiles stay stable while the table narrows.
 *  `byRole` and `byJobSetting` feed the dropdowns' option-row counts. */
export interface MembersStats {
  total: number;
  active: number;
  invited: number;
  /** Members parked by the owner (status `deactivated`). */
  deactivated: number;
  /** Active employees whose jobs wait for the owner's approval first. */
  needsApproval: number;
  byRole: { all: number; company_admin: number; employee: number; viewer: number };
  byJobSetting: { all: number; off: number; createOnly: number; approval: number };
}

export type MembersStatusFilter = "all" | "active" | "invited" | "deactivated";
export type MembersRoleFilter = "all" | "company_admin" | "employee" | "viewer";
export type MembersJobSettingFilter = "all" | "off" | "create_only" | "approval";
export type MembersSort =
  "joined_new" | "joined_old" | "name_az" | "name_za" | "code_az" | "code_za";

export type MembersPageQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: MembersStatusFilter;
  role?: MembersRoleFilter;
  jobSetting?: MembersJobSettingFilter;
  sort?: MembersSort;
};

export interface MembersPageResult {
  data: MemberRow[];
  /** How many rows the current filters keep, across all pages. */
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  stats: MembersStats;
}

/** GET /members/page — the console's paged team list. The endpoint answers
 *  one page; `stats` always describes the whole company. */
export function fetchMembersPage(
  token: string,
  query: MembersPageQuery,
  signal?: AbortSignal,
): Promise<MembersPageResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search) params.set("search", query.search);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.role && query.role !== "all") params.set("role", query.role);
  if (query.jobSetting && query.jobSetting !== "all") params.set("jobSetting", query.jobSetting);
  if (query.sort && query.sort !== "joined_new") params.set("sort", query.sort);
  return apiFetch<MembersPageResult>(`/api/v1/members/page?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** POST /auth/invite/:id/resend-sms — sends the invite text again. Returns the
 *  new `sms_status` (sent, failed, refused_cap or not_configured); null when
 *  the body carries none. */
export function resendInviteSms(
  token: string,
  membershipUserId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  return apiFetch<{ sms_status?: string | null }>(
    `/api/v1/auth/invite/${encodeURIComponent(membershipUserId)}/resend-sms`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal },
  ).then((row) => row.sms_status ?? null);
}

export function fetchCompanyLeave(token: string, signal?: AbortSignal): Promise<Page<LeaveRow>> {
  return apiFetch<Page<LeaveRow>>("/api/v1/attendance/leave?limit=8", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** ── The owner's full-list drill-downs (existing endpoints) ─────────── */

/** ── The console's paged customer list (GET /customers/page) ─────────── */

export interface CustomerRow {
  id: string;
  name: string;
  /** Display identity CST-001 — minted by the backend, never an authz key. */
  customerCode: string;
  countryCode: string;
  phoneNumber: string;
  address: string | null;
  city: string | null;
  jobCount: number;
  lastJobDate: string | null;
}

/** The whole-company bucket counters the Customers page's stat tiles show.
 *  The buckets are disjoint over job history, so they sum to `total`; counted
 *  before any filter, so tiles stay stable while the table narrows. */
export interface CustomersStats {
  total: number;
  new: number;
  single: number;
  repeat: number;
}

export type CustomerBucketFilter = "all" | "new" | "single" | "repeat";
export type CustomersSort =
  "created_new" | "created_old" | "name_az" | "name_za" | "recent_activity";

export type CustomersPageQuery = {
  page: number;
  pageSize: number;
  search?: string;
  bucket?: CustomerBucketFilter;
  sort?: CustomersSort;
};

export interface CustomersPageResult {
  data: CustomerRow[];
  /** How many rows the current filters keep, across all pages. */
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  stats: CustomersStats;
}

/** GET /customers/page — the console's paged customer list. The endpoint
 *  answers one page; `stats` always describes the whole company. */
export function fetchCustomersPage(
  token: string,
  query: CustomersPageQuery,
  signal?: AbortSignal,
): Promise<CustomersPageResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search) params.set("search", query.search);
  if (query.bucket && query.bucket !== "all") params.set("filter", query.bucket);
  if (query.sort && query.sort !== "created_new") params.set("sort", query.sort);
  return apiFetch<CustomersPageResult>(`/api/v1/customers/page?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** POST /customers — creates a customer from the add-customer dialog. The
 *  response echoes the minted code, so the dialog can show it once. */
export function createCustomer(
  token: string,
  body: {
    name: string;
    countryCode: string;
    phoneNumber: string;
    address?: string;
    city?: string;
  },
  signal?: AbortSignal,
): Promise<CustomerResponseEcho> {
  return apiFetch<CustomerResponseEcho>("/api/v1/customers", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

/** The create response's fields the dialog reads. */
export interface CustomerResponseEcho {
  id: string;
  name: string;
  customerCode: string;
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

/** The whole-company job counters the Jobs page's stat tiles and status
 *  chips show — one per status, so every chip's count is honest; counted
 *  before any filter, so they stay stable while the table narrows. */
export interface JobsStats {
  total: number;
  scheduled: number;
  inProgress: number;
  pendingApproval: number;
  completed: number;
  cancelled: number;
  rejected: number;
  /** Jobs completed in the last 30 days. */
  completed30d: number;
}

export type JobsStatusFilter =
  "" | "scheduled" | "in_progress" | "pending_approval" | "completed" | "cancelled" | "rejected";
export type JobsPriorityFilter = "" | "normal" | "urgent";
export type JobsSort = "latest" | "soonest";

export type JobsPageQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: JobsStatusFilter;
  skillId?: string;
  priority?: JobsPriorityFilter;
  sort?: JobsSort;
  /** One employee's jobs (the profile page's Jobs tab). When set, `stats`
   *  describes THAT employee's jobs, not the whole company. */
  technicianId?: string;
};

export interface JobsPageResult {
  data: JobRow[];
  /** How many rows the current filters keep, across all pages. */
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  stats: JobsStats;
}

/** GET /jobs/page — the console's paged jobs table. The endpoint answers one
 *  page; `stats` always describes the whole company. */
export function fetchJobsPage(
  token: string,
  query: JobsPageQuery,
  signal?: AbortSignal,
): Promise<JobsPageResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.skillId) params.set("skillId", query.skillId);
  if (query.priority) params.set("priority", query.priority);
  if (query.sort && query.sort !== "latest") params.set("sort", query.sort);
  if (query.technicianId) params.set("technicianId", query.technicianId);
  return apiFetch<JobsPageResult>(`/api/v1/jobs/page?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export interface HolidayRow {
  id: string;
  date: string;
  name: string;
  /** Optional one-liner the schedule page renders (null when unset). */
  description?: string | null;
  /** 'all' (every office) or 'offices' (only officeIds) — absent on an
   *  older backend, which behaves as 'all'. */
  scope?: string;
  officeIds?: string[];
  /** Employees closed on THIS holiday's own date — the overview ships it
   *  date-anchored so it always matches the inspector; absent on other
   *  sources (the client then derives an approximation from today's
   *  roster). */
  employeesOff?: number;
}

export function fetchHolidays(token: string, signal?: AbortSignal): Promise<HolidayRow[]> {
  return apiFetch<HolidayRow[]>("/api/v1/attendance/holidays", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** GET /attendance/holidays/overview?year= — the console's year view: the
 *  year's holidays with their offices, plus the CURRENT staff headcount per
 *  office and the enrolled-but-office-less count, so the pages can say
 *  "94 employees have off" without one fetch per row. The tenant's weekly
 *  off defaults feed the long-break finder (empty days = no weekly off). */
export interface HolidayOverview {
  year: string;
  holidays: HolidayRow[];
  offices: { officeId: string; name: string; staffCount: number }[];
  unassignedCount: number;
  weeklyOffDefaults: { valid: string; days: number[] }[];
}

export function fetchHolidayOverview(
  token: string,
  year: string,
  signal?: AbortSignal,
): Promise<HolidayOverview> {
  return apiFetch<HolidayOverview>(`/api/v1/attendance/holidays/overview?year=${year}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** GET /attendance/holidays/impact?date= — one date's facts for the
 *  inspector sidebar: the holiday (null on a plain date), the approved-leave
 *  overlap (the shipped affectedEmployees list), the tracked headcount and
 *  the per-office staff counts with their closed flags. */
export interface HolidayImpact {
  date: string;
  affectedEmployees: { employeeId: string; employeeName: string; avatarUrl: string | null }[];
  holiday: HolidayRow | null;
  approvedLeaveCount: number;
  trackedCount: number;
  perOffice: { officeId: string; name: string; staffCount: number; closed: boolean }[];
  unassignedCount: number;
}

export function fetchHolidayImpact(
  token: string,
  date: string,
  signal?: AbortSignal,
): Promise<HolidayImpact> {
  return apiFetch<HolidayImpact>(`/api/v1/attendance/holidays/impact?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export function createHoliday(
  token: string,
  input: { date: string; name: string; description?: string | null; officeIds?: string[] },
): Promise<HolidayRow> {
  // No office chips picked = every office; the backend's scope gate requires
  // the explicit word, so the modal's semantics travel as scope.
  const officeIds = input.officeIds ?? [];
  return apiFetch<HolidayRow>("/api/v1/attendance/holidays", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, officeIds, scope: officeIds.length > 0 ? "offices" : "all" }),
  });
}

export function updateHoliday(
  token: string,
  id: string,
  input: { date?: string; name?: string; description?: string | null; officeIds?: string[] },
): Promise<HolidayRow> {
  const officeIds = input.officeIds ?? [];
  return apiFetch<HolidayRow>(`/api/v1/attendance/holidays/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, officeIds, scope: officeIds.length > 0 ? "offices" : "all" }),
  });
}

export function removeHoliday(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/attendance/holidays/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** The MIME Excel sheets travel under — the bulk endpoints' body contract. */
const HOLIDAY_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** One problem row of a rejected bulk sheet — the 422 body's errors array. */
export interface HolidayBulkRowError {
  /** The sheet row the problem is on (row 1 = the header). */
  row: number;
  date: string | null;
  name: string | null;
  message: string;
}

/** GET /attendance/holidays/bulk-template — the .xlsx sheet to download,
 *  fill and upload. The template is binary, so unlike the JSON calls above
 *  this one reads a blob straight off the response. */
export async function downloadHolidayTemplate(token: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/attendance/holidays/bulk-template`, {
    headers: { Authorization: `Bearer ${token}`, Accept: HOLIDAY_XLSX_MIME },
    signal,
  });
  if (!response.ok) {
    let errorCode: string | undefined;
    try {
      const body: unknown = await response.json();
      if (typeof body === "object" && body !== null && "error_code" in body) {
        errorCode = String((body as { error_code: unknown }).error_code);
      }
    } catch {
      // A binary endpoint's failure may not be JSON — the status carries it.
    }
    throw new ApiError(response.status, `Request failed with status ${response.status}`, errorCode);
  }
  // A 200 that is not the spreadsheet (a proxy interstitial, a stale gateway
  // page) would otherwise save as an unreadable .xlsx and burn the user's
  // filling time before the upload fails.
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("spreadsheetml.sheet")) {
    throw new ApiError(response.status, "The download did not return an Excel sheet.");
  }
  return response.blob();
}

/** POST /attendance/holidays/bulk — the filled sheet as a raw .xlsx body.
 *  All-or-nothing: any bad row answers 422
 *  ATTENDANCE_HOLIDAY_BULK_INVALID with the per-row errors on ApiError.body
 *  and NOTHING was written. A row whose date already exists stays skipped
 *  when identical; a changed name, description, or office set UPDATES that
 *  holiday in place (the sheet is the edit surface) — `updates` names what
 *  changed so the done card can say so. */
export function bulkUploadHolidays(
  token: string,
  file: File,
  signal?: AbortSignal,
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  holidays: HolidayRow[];
  updates: HolidayRow[];
}> {
  return apiFetch("/api/v1/attendance/holidays/bulk", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": HOLIDAY_XLSX_MIME },
    body: file,
    signal,
  });
}

/** The whole tenant's request counts by derived status — the requests tab's
 *  filter pills. Optional on the wire: an older backend answers the summary
 *  without it, and the pills degrade to labels only. */
export interface LeaveStatusCounts {
  pending: number;
  approved: number;
  revoked: number;
  cancelled: number;
  rejected: number;
}

/** The team-size fact the calendar rail's pulse card divides the month's
 *  leave days by — the company's active employees — plus the requests tab's
 *  whole-tenant pill counts. */
export interface LeaveSummary {
  activeEmployees: number;
  counts?: LeaveStatusCounts;
}

export function fetchLeaveSummary(token: string, signal?: AbortSignal): Promise<LeaveSummary> {
  return apiFetch<LeaveSummary>("/api/v1/attendance/leave/summary", {
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
