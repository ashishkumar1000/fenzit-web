import { apiFetch } from "../../services/api";
import type { LeaveRow, Page } from "./companyApi";

/**
 * Clients for the Me section — an employee's (or viewer's) own data. All
 * endpoints already exist under the own-scope permissions; nothing here can
 * see anyone else.
 */

export interface TodayFacts {
  date: string;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  isWorkingDay: boolean;
  leaveState: string | null;
  leavePart: string | null;
}

export interface TodayRecord {
  checkinAt: string | null;
  checkoutAt: string | null;
  lateMinutes: number;
  isLate: boolean;
  workedMinutes: number | null;
}

export interface MeSummary {
  officeName: string | null;
  startTime: string | null;
  endTime: string | null;
  lateCutOffMinutes: number | null;
  weeklyOffDays: number[];
  officeLatitude: number | null;
  officeLongitude: number | null;
  officeRadius: number | null;
  today: TodayFacts | null;
  todayRecord: TodayRecord | null;
}

export interface MeMonthSummary {
  from: string;
  to: string;
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
  weeklyOffs: number[];
  upcomingHolidays: Array<{ id: string; date: string; name: string }>;
}

export interface JobRow {
  jobNumber: string;
  status: string;
  priority: string | null;
  scheduledStart: string | null;
  currentStep: string | null;
  skill: { id: string; name: string } | null;
}

export function fetchMySummary(token: string, signal?: AbortSignal): Promise<MeSummary> {
  return apiFetch<MeSummary>("/api/v1/attendance/me/summary", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** This employee's own month summary (FR-26) — current month by default. */
export function fetchMyMonthly(
  token: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<MeMonthSummary> {
  return apiFetch<MeMonthSummary>(`/api/v1/attendance/me/monthly?from=${from}&to=${to}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export function fetchMyLeave(token: string, signal?: AbortSignal): Promise<Page<LeaveRow>> {
  return apiFetch<Page<LeaveRow>>("/api/v1/attendance/me/leave?limit=8", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export function fetchMyJobs(token: string, signal?: AbortSignal): Promise<Page<JobRow>> {
  return apiFetch<Page<JobRow>>("/api/v1/jobs?scope=history", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}
