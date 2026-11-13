import { apiFetch } from "../../services/api";

/**
 * Clients for the job-reports dashboard (Epic 22, CAP-8). The backend computes
 * every figure from job records for an IST day window; this file only types
 * what the console renders. Window ends are `YYYY-MM-DD` calendar days,
 * inclusive; with no params the server uses its default 30-day window ending
 * today in IST.
 *
 * Documented failures: 401 (no session) · 403 (owner report needs a company
 * admin; employee report needs a membership) · 422 (window not valid — real
 * dates, at most 366 days).
 */

/** `created` — one job is exactly one of these outcomes (BE `countOutcomes`). */
export interface JobOutcomeCounts {
  created: number;
  approved: number;
  autoApproved: number;
  rejected: number;
  pending: number;
  cancelled: number;
}

/** The owner dashboard's four required headline counts (reports-dashboard.md). */
export interface OwnerHeadline {
  /** Jobs created by employees in the window. */
  employeeCreated: number;
  /** Employee-created jobs the owner approved manually. */
  employeeApproved: number;
  /** Employee-created jobs auto-approved (approval off). */
  employeeAutoApproved: number;
  /** Jobs the owner created. */
  ownerCreated: number;
}

export interface OwnerPipeline {
  pending: number;
  pendingOverOneDay: number;
  rejected: number;
  rejectedWithReason: number;
  rejectedWithoutReason: number;
  /** approved / (approved + rejected), 0–1; null when nothing was decided. */
  approvalRate: number | null;
  averageMinutesToDecision: number | null;
  medianMinutesToDecision: number | null;
  /** The job that has waited longest, or null when nothing is pending. */
  oldestPending: { id: string; jobNumber: string; submittedAt: string } | null;
}

/** One per-employee row of the owner dashboard's breakdown table. */
export interface OwnerEmployeeRow extends JobOutcomeCounts {
  employeeId: string;
  name: string | null;
  /** This employee's share of the company's employee-created jobs, 0–1. */
  shareOfEmployeeCreated: number | null;
}

export interface OwnerReportResponse {
  range: { from: string; to: string };
  headline: OwnerHeadline;
  pipeline: OwnerPipeline;
  perEmployee: OwnerEmployeeRow[];
  /** Active employees with job creation on but no job created in the window. */
  employeesWithPermissionNoJobs: Array<{ employeeId: string; name: string | null }>;
}

/** One rejection in the employee's reasons list, newest decision first. */
export interface EmployeeReportRejection {
  jobId: string;
  jobNumber: string;
  /** The owner's reason, or null when they declined without one. */
  reason: string | null;
  decidedAt: string;
}

export interface EmployeeReportResponse {
  range: { from: string; to: string };
  created: JobOutcomeCounts;
  approvalRate: number | null;
  averageMinutesToDecision: number | null;
  medianMinutesToDecision: number | null;
  /** My jobs scheduled or in progress right now. */
  assignedNow: number;
  /** My jobs completed inside the window. */
  completedInRange: number;
  /** Capped list (50); `rejectionReasonsTotal` is the true count. */
  rejectionReasons: EmployeeReportRejection[];
  rejectionReasonsTotal: number;
}

/** A preset or custom IST day window for either report. */
export interface ReportRange {
  from: string;
  to: string;
}

function rangeQuery(range: ReportRange): string {
  return `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
}

/** An empty 200 is an error, not a report: the dashboard would render `undefined`
 *  counts as if they were zeros. Each check names the fields the dashboard
 *  actually renders, so a shape the pages cannot read fails here with one
 *  message instead of crashing mid-render. */
const BAD_REPORT = "The report response did not look as expected.";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isCount(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function assertCounts(row: Record<string, unknown>, keys: readonly string[]): void {
  if (!keys.every((key) => isCount(row[key]))) throw new Error(BAD_REPORT);
}

const OUTCOME_KEYS = ["created", "approved", "autoApproved", "rejected", "pending"] as const;

function assertOwnerReport(report: OwnerReportResponse): void {
  if (!isObject(report)) throw new Error(BAD_REPORT);
  const headline = report.headline as unknown;
  if (!isObject(headline)) throw new Error(BAD_REPORT);
  assertCounts(headline, [
    "employeeCreated",
    "employeeApproved",
    "employeeAutoApproved",
    "ownerCreated",
  ]);
  const pipeline = report.pipeline as unknown;
  if (!isObject(pipeline)) throw new Error(BAD_REPORT);
  assertCounts(pipeline, [
    "pending",
    "pendingOverOneDay",
    "rejected",
    "rejectedWithReason",
    "rejectedWithoutReason",
  ]);
  for (const key of ["approvalRate", "averageMinutesToDecision", "medianMinutesToDecision"]) {
    const value = pipeline[key];
    if (value !== null && !isCount(value)) throw new Error(BAD_REPORT);
  }
  if (pipeline.oldestPending !== null && !isObject(pipeline.oldestPending))
    throw new Error(BAD_REPORT);
  if (!Array.isArray(report.perEmployee) || !Array.isArray(report.employeesWithPermissionNoJobs)) {
    throw new Error(BAD_REPORT);
  }
}

function assertEmployeeReport(report: EmployeeReportResponse): void {
  if (!isObject(report)) throw new Error(BAD_REPORT);
  const created = report.created as unknown;
  if (!isObject(created)) throw new Error(BAD_REPORT);
  assertCounts(created, [...OUTCOME_KEYS, "cancelled"]);
  for (const key of ["approvalRate", "averageMinutesToDecision", "medianMinutesToDecision"]) {
    const value = (report as unknown as Record<string, unknown>)[key];
    if (value !== null && !isCount(value)) throw new Error(BAD_REPORT);
  }
  if (
    !isCount(report.assignedNow) ||
    !isCount(report.completedInRange) ||
    !isCount(report.rejectionReasonsTotal)
  ) {
    throw new Error(BAD_REPORT);
  }
  if (!Array.isArray(report.rejectionReasons)) throw new Error(BAD_REPORT);
}

export async function fetchOwnerReport(
  token: string,
  range: ReportRange,
  signal?: AbortSignal,
): Promise<OwnerReportResponse> {
  const report = await apiFetch<OwnerReportResponse>(
    `/api/v1/job-reports/owner${rangeQuery(range)}`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
  assertOwnerReport(report);
  return report;
}

export async function fetchEmployeeReport(
  token: string,
  range: ReportRange,
  signal?: AbortSignal,
): Promise<EmployeeReportResponse> {
  const report = await apiFetch<EmployeeReportResponse>(
    `/api/v1/job-reports/employee${rangeQuery(range)}`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
  assertEmployeeReport(report);
  return report;
}
