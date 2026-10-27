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
