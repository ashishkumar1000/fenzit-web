import { apiFetch } from "../../services/api";
import type { LeaveRow, Page } from "./companyApi";

/**
 * Clients for one employee's profile page (the `company/employees/:userId`
 * tabs). Every endpoint already exists — this file only types the parts of
 * each response the profile renders. The statutory fields deliberately come
 * from the employment endpoint (`payrollApi.fetchEmployment`), never from
 * the member read: PAN/DOB/bank flow only through that one surface.
 */

/** One member of the company, as GET /members/:userId answers (plus skills). */
export interface EmployeeProfile {
  userId: string;
  name: string | null;
  email: string | null;
  countryCode: string;
  phoneNumber: string;
  employeeCode: string;
  role: string;
  status: "invited" | "active" | "deactivated" | "removed";
  createdAt: string;
  avatarUrl: string | null;
  canCreateJobs: boolean;
  jobApprovalRequired: boolean;
  skills: Array<{ id: string; name: string }>;
}

export function fetchMember(
  token: string,
  userId: string,
  signal?: AbortSignal,
): Promise<EmployeeProfile> {
  return apiFetch<EmployeeProfile>(`/api/v1/members/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** Park or reinstate a member (PATCH /members/:userId/active). */
export function setMemberActive(
  token: string,
  userId: string,
  active: boolean,
  signal?: AbortSignal,
): Promise<{ userId: string; status: string }> {
  return apiFetch<{ userId: string; status: string }>(
    `/api/v1/members/${encodeURIComponent(userId)}/active`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
      signal,
    },
  );
}

/** One row of the attendance enrolments roster (GET /attendance/enrolments):
 *  the profile's office-assignment card picks this employee out of it. */
export interface EnrolmentRow {
  employeeId: string;
  memberStatus: "invited" | "active" | "deactivated";
  attendanceEnabled: boolean;
  attendanceAccess: "none" | "upcoming" | "active" | "history_only";
  /** `YYYY-MM-DD` — the enrolment's start, "Assigned since …". */
  attendanceStartDate: string | null;
  officeId: string | null;
  officeName: string | null;
}

export function fetchEnrolments(token: string, signal?: AbortSignal): Promise<EnrolmentRow[]> {
  return apiFetch<EnrolmentRow[]>("/api/v1/attendance/enrolments", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** One effective-dated office rule, times as HH:mm (GET /attendance/offices/:id). */
export interface OfficeRule {
  startTime: string;
  endTime: string;
  lateCutoffMinutes: number;
  fullDayHours: number;
  halfDayHours: number;
  validFrom: string;
  validTo: string | null;
}

export interface OfficeDetail {
  id: string;
  name: string;
  radiusM: number;
  formattedAddress: string | null;
  rules: OfficeRule[];
}

export function fetchOffice(
  token: string,
  officeId: string,
  signal?: AbortSignal,
): Promise<OfficeDetail> {
  return apiFetch<OfficeDetail>(`/api/v1/attendance/offices/${encodeURIComponent(officeId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** One punch-history row (GET /attendance/punches) — the effective instants
 *  (a manual correction replaces the raw GPS pair), distances only when the
 *  paired source is the original GPS fix. */
export interface PunchRow {
  workDate: string;
  checkinAt: string | null;
  checkinDistanceM: number | null;
  checkoutAt: string | null;
  checkoutDistanceM: number | null;
  officeId: string | null;
  officeName: string | null;
  status: string;
  corrected: boolean;
}

export interface PunchesResult {
  employeeId: string;
  from: string;
  to: string;
  today: string;
  punches: PunchRow[];
}

export function fetchPunches(
  token: string,
  employeeId: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<PunchesResult> {
  const params = new URLSearchParams({ employeeId, from, to });
  return apiFetch<PunchesResult>(`/api/v1/attendance/punches?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** One leave balance (GET /attendance/leave/:employeeId/balances): accrual-
 *  bearing types only, the numbers the day-status engine actually uses. */
export interface LeaveBalance {
  typeId: string;
  code: string;
  name: string;
  accrualMode: string;
  accrualDays: number;
  enabled: boolean;
  remaining: number;
}

export function fetchLeaveBalances(
  token: string,
  employeeId: string,
  signal?: AbortSignal,
): Promise<LeaveBalance[]> {
  return apiFetch<LeaveBalance[]>(
    `/api/v1/attendance/leave/${encodeURIComponent(employeeId)}/balances`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
}

/** First page of the employee's leave requests (GET /attendance/leave). */
export function fetchEmployeeLeave(
  token: string,
  employeeId: string,
  signal?: AbortSignal,
): Promise<Page<LeaveRow>> {
  const params = new URLSearchParams({ employeeId, limit: "8" });
  return apiFetch<Page<LeaveRow>>(`/api/v1/attendance/leave?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** One payslip of a payroll month (GET /payroll/payslips?month=). The whole
 *  month answers at once — the profile filters it to this employee. */
export interface PayslipRow {
  id: string;
  user_id: string;
  slip_number: string;
  salary_period: string;
  payable_days: number;
  lop_days: number;
  paid_days: number;
  gross_earnings: number;
  net_wages: number;
}

export function fetchPayslips(
  token: string,
  month: string,
  signal?: AbortSignal,
): Promise<PayslipRow[]> {
  const params = new URLSearchParams({ month });
  return apiFetch<PayslipRow[]>(`/api/v1/payroll/payslips?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}
