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

/** The pipeline object the mobile app reads (`pipeline.pending`, Epic 22) —
 *  after the 2026-11-27 overview revamp only the waiting count survives; the
 *  rest of the old pipeline retired with the overview cards it fed. */
export interface OwnerPipeline {
  /** Employee-created jobs waiting for the owner's decision right now. */
  pending: number;
}

/** The light owner report (2026-11-28 slimming): what the mobile summary and
 *  the jobs page's waiting badge read. The chart sections cost real queries,
 *  so they ride the same endpoint only when asked (`?charts=true`). */
export interface OwnerReportResponse {
  range: { from: string; to: string };
  headline: OwnerHeadline;
  pipeline: OwnerPipeline;
}

/** The exec dashboard's report: the light report plus the two chart sections
 *  — `fetchOwnerExecReport`'s ask, the overview page's read. */
export interface OwnerExecReportResponse extends OwnerReportResponse {
  /** 2026-11-27 exec dashboard: the cumulative job-flow chart + efficiency. */
  trend: OwnerTrend;
  /** 2026-11-27 exec dashboard: the workforce analytics chart. */
  workforce: OwnerWorkforce;
}

/** One slice of the exec dashboard's window (2026-11-27): equal day spans,
 *  oldest first — the same slicing serves every overview chart. */
export interface OwnerTrendSlice {
  from: string;
  to: string;
}

/** Cumulative job-flow counts AT a slice's end — the chart's rising lines. */
export interface OwnerTrendBucket extends OwnerTrendSlice {
  employeeCreated: number;
  employeeApproved: number;
  employeeAutoApproved: number;
  ownerCreated: number;
}

export interface OwnerTrend {
  buckets: OwnerTrendBucket[];
  /** approved / (approved + rejected) over the window; null when nothing
   *  was decided. */
  turnaroundEfficiency: number | null;
}

/** Workforce counts AS OF a slice's end (the BE documents the semantics). */
export interface OwnerWorkforceBucket extends OwnerTrendSlice {
  totalEmployees: number;
  activeEmployees: number;
  pendingInvites: number;
  needsApproval: number;
}

export interface OwnerWorkforce {
  buckets: OwnerWorkforceBucket[];
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

/** The light report's fields — the ones the mobile summary and the jobs
 *  page's badge actually read. */
function assertLightReport(report: OwnerReportResponse): void {
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
  if (!isObject(pipeline) || !isCount(pipeline.pending)) throw new Error(BAD_REPORT);
}

function assertOwnerReport(report: OwnerReportResponse): void {
  assertLightReport(report);
}

/** The exec dashboard's sections (?charts=true, 2026-11-27): a backend older
 *  than the trend/workforce fields fails the shape check loudly instead of
 *  rendering undefined charts. */
function assertExecReport(report: OwnerExecReportResponse): void {
  assertLightReport(report);
  const trend = report.trend as unknown;
  if (!isObject(trend) || !Array.isArray(trend.buckets)) throw new Error(BAD_REPORT);
  for (const bucket of trend.buckets as unknown[]) {
    if (!isObject(bucket)) throw new Error(BAD_REPORT);
    assertCounts(bucket, [
      "employeeCreated",
      "employeeApproved",
      "employeeAutoApproved",
      "ownerCreated",
    ]);
  }
  if (trend.turnaroundEfficiency !== null && !isCount(trend.turnaroundEfficiency))
    throw new Error(BAD_REPORT);
  const workforce = report.workforce as unknown;
  if (!isObject(workforce) || !Array.isArray(workforce.buckets)) throw new Error(BAD_REPORT);
  for (const bucket of workforce.buckets as unknown[]) {
    if (!isObject(bucket)) throw new Error(BAD_REPORT);
    assertCounts(bucket, ["totalEmployees", "activeEmployees", "pendingInvites", "needsApproval"]);
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

/** The overview page's read: the same report with `?charts=true`, so the
 *  response carries the trend + workforce sections — asserted, never
 *  assumed. */
export async function fetchOwnerExecReport(
  token: string,
  range: ReportRange,
  signal?: AbortSignal,
): Promise<OwnerExecReportResponse> {
  const report = await apiFetch<OwnerExecReportResponse>(
    `/api/v1/job-reports/owner${rangeQuery(range)}&charts=true`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
  assertExecReport(report);
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
