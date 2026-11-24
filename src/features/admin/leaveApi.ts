import { apiFetch } from "../../services/api";
import type { LeaveRow, Page } from "./companyApi";

/**
 * Clients for the owner's Leave section — the fixed leave-type catalog and
 * the whole-company leave requests with their approvals. Every endpoint
 * already exists (23-13) and is granted to company_admin by the roles spec;
 * this file only types the parts of each response the console renders.
 */

export interface LeaveTypeRow {
  id: string;
  /** earned | sick | bereavement | comp_off — null marks a legacy remnant. */
  code: string | null;
  name: string;
  /** monthly | annual | none — how the type grants leave. */
  accrualMode: string | null;
  /** Days per month (monthly) or the annual grant; 0 = no credit accrues. */
  accrualDays: number;
  carryForward: boolean;
  allowOverBalance: boolean;
  paid: boolean;
  enabled: boolean;
  /** false = legacy remnant; the PATCH refuses it (LEAVE_TYPE_NOT_CONFIGURABLE). */
  configurable: boolean;
}

/** The five values the PATCH accepts. The catalog is fixed — names, codes
 *  and accrual modes are inherent, and unknown keys are stripped server-side. */
export type LeaveTypePatch = Partial<{
  accrualDays: number;
  carryForward: boolean;
  allowOverBalance: boolean;
  paid: boolean;
  enabled: boolean;
}>;

export function fetchLeaveTypes(token: string, signal?: AbortSignal): Promise<LeaveTypeRow[]> {
  return apiFetch<LeaveTypeRow[]>("/api/v1/attendance/leave/types", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** Values-only PATCH; the body carries changed fields only. */
export function patchLeaveType(
  token: string,
  id: string,
  values: LeaveTypePatch,
  signal?: AbortSignal,
): Promise<LeaveTypeRow> {
  return apiFetch<LeaveTypeRow>(`/api/v1/attendance/leave/types/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(values),
    signal,
  });
}

export interface LeavePageQuery {
  /** pending | approved | revoked | cancelled | rejected — the derived status. */
  status?: string;
  cursor?: string;
  limit?: number;
  /** 27-1's overlap window: requests whose span intersects [from, to].
   *  `from > to` answers 422. */
  from?: string;
  to?: string;
}

export function fetchLeavePage(
  token: string,
  query: LeavePageQuery,
  signal?: AbortSignal,
): Promise<Page<LeaveRow>> {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  const qs = params.toString();
  return apiFetch<Page<LeaveRow>>(`/api/v1/attendance/leave${qs === "" ? "" : `?${qs}`}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** One balance row of the backend's derived April–March answer — one per
 *  accrual-bearing type; disabled types appear too (their consumed days still
 *  count), Comp-Off never does (no balance to track). */
export interface LeaveBalanceRow {
  typeId: string;
  code: string;
  name: string;
  accrualMode: string;
  accrualDays: number;
  enabled: boolean;
  credits: number;
  accrued: number;
  carryForward: number;
  /** Pending + approved working days of this FY — future-dated days debit now. */
  consumed: number;
  /** credits + accrued + carryForward - consumed. */
  remaining: number;
}

/** One employee's balances for the current FY. The panel renders this as a
 *  generic per-type list — list rows carry no leaveTypeId, so there is no
 *  "the row for this request's type" to pick. */
export function fetchLeaveBalances(
  token: string,
  employeeId: string,
  signal?: AbortSignal,
): Promise<LeaveBalanceRow[]> {
  return apiFetch<LeaveBalanceRow[]>(
    `/api/v1/attendance/leave/${encodeURIComponent(employeeId)}/balances`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
}

/** FR-13 approve: every pending day becomes approved. A retry of an already
 *  approved request answers 200 (idempotent), a stale one 409. */
export function approveLeave(token: string, id: string, signal?: AbortSignal): Promise<LeaveRow> {
  return apiFetch<LeaveRow>(`/api/v1/attendance/leave/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** FR-13 reject: the reason is optional — the body is omitted when empty. */
export function rejectLeave(
  token: string,
  id: string,
  reason: string,
  signal?: AbortSignal,
): Promise<LeaveRow> {
  const body = reason === "" ? undefined : JSON.stringify({ reason });
  return apiFetch<LeaveRow>(`/api/v1/attendance/leave/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? undefined : { "Content-Type": "application/json" }),
    },
    body,
    signal,
  });
}

/** FR-14 revoke: the reason is required, and only not-yet-started approved
 *  days go — the server answers 409 LEAVE_NOT_REVOKABLE otherwise. */
export function revokeLeave(
  token: string,
  id: string,
  reason: string,
  signal?: AbortSignal,
): Promise<LeaveRow> {
  return apiFetch<LeaveRow>(`/api/v1/attendance/leave/${encodeURIComponent(id)}/revoke`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    signal,
  });
}
