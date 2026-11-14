import { apiFetch } from "../../services/api";
import { readSession } from "../../services/session";

/**
 * The owner's job activity PDF (POST /reports, then GET /reports/:id until
 * the file is ready). The backend generates asynchronously — the request
 * answers `{ id, status }` at once and the file arrives seconds later, so
 * the UI polls a few times and hands the user the download link. Owner only
 * (the permission is `report.request`); an employee's click answers 403.
 *
 * Documented failures: 401 (no session) · 403 (owner only) · 422 (bad
 * window) · the job failing server-side (`error.code`).
 */

/** The active roster person, as the report card's employee picker needs:
 *  the name is the visible label, phone and employee code feed the search
 *  (two employees can share a name — the phone number cannot collide). */
export interface RosterPerson {
  id: string;
  name: string;
  /** The display phone, e.g. "+91 98354 20955". */
  phone: string;
  /** The employee code (EMP-…), "" when the member has none. */
  employeeCode: string;
}

const BAD_ACK = "The report service did not acknowledge the request.";

/** The report types the console offers. The backend registry owns the ids;
 *  both take the same IST day window (attendance scopes by office, omitted
 *  here = every office). */
export type ReportTypeChoice = "technician_job_activity" | "attendance_report";

export const REPORT_TYPES: Array<{ value: ReportTypeChoice; label: string }> = [
  { value: "technician_job_activity", label: "Job activity" },
  { value: "attendance_report", label: "Attendance" },
];

export function reportTypeLabel(type: string): string {
  return REPORT_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** One row of the report history (GET /reports, newest first) — every type
 *  the company has generated; the card filters by the picked type. */
export interface ReportHistoryRow {
  id: string;
  reportType: string;
  range: { startDate: string; endDate: string };
  /** Selected technician count; null = the whole company. */
  technicianCount: number | null;
  status: string;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

const BAD_HISTORY = "The report history did not look as expected.";

/** The owner's report history, newest first — the card lists these so an
 *  older report can be downloaded again without regenerating. */
export async function fetchReportHistory(
  token: string,
  signal?: AbortSignal,
): Promise<ReportHistoryRow[]> {
  const page = await apiFetch<unknown>("/api/v1/reports?limit=10", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (page === null || typeof page !== "object" || !("data" in page)) {
    throw new Error(BAD_HISTORY);
  }
  const rows = (page as { data: unknown }).data;
  if (!Array.isArray(rows)) throw new Error(BAD_HISTORY);
  return (rows as unknown[]).filter((row): row is ReportHistoryRow => {
    if (row === null || typeof row !== "object") return false;
    const one = row as Partial<ReportHistoryRow> & Record<string, unknown>;
    // The range too: the list reads row.range.startDate for its label, so a
    // row without one must be dropped here, not crash the card.
    const range = one.range as unknown;
    return (
      typeof one.id === "string" &&
      one.id !== "" &&
      typeof one.reportType === "string" &&
      one.reportType !== "" &&
      typeof one.createdAt === "string" &&
      typeof one.status === "string" &&
      range !== null &&
      typeof range === "object" &&
      typeof (range as Record<string, unknown>).startDate === "string" &&
      typeof (range as Record<string, unknown>).endDate === "string"
    );
  });
}

/** Re-queues one failed report in place — the same row regenerates and the
 *  history keeps a single row per intent. Owner permission (`report.request`).
 *  No body: the backend rejects an empty body that declares JSON. */
export async function retryReport(
  token: string,
  requestId: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiFetch<void>(`/api/v1/reports/${encodeURIComponent(requestId)}/retry`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

interface ReportStatus {
  id: string;
  status: string;
  errorCode?: string | null;
  file?: { url: string; filename?: string } | null;
}

/** Queues one report of the chosen type. `technicianIds` scopes the job
 *  report to specific employees ([] or omitted = the whole company); the
 *  attendance report ignores it (it scopes by office, sent empty = all).
 *  Dates are IST `YYYY-MM-DD` days, at most 366 apart (the BE validates). */
export async function requestReport(
  type: ReportTypeChoice,
  params: { startDate: string; endDate: string; technicianIds?: string[] },
  signal?: AbortSignal,
): Promise<string> {
  const session = readSession();
  const token = session?.token ?? "";
  const ack = await apiFetch<unknown>("/api/v1/reports", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reportType: type,
      startDate: params.startDate,
      endDate: params.endDate,
      ...(type === "technician_job_activity" && params.technicianIds !== undefined
        ? { technicianIds: params.technicianIds }
        : {}),
    }),
    signal,
  });
  if (
    ack === null ||
    typeof ack !== "object" ||
    !("id" in ack) ||
    typeof (ack as { id: unknown }).id !== "string" ||
    (ack as { id: string }).id === ""
  ) {
    throw new Error(BAD_ACK);
  }
  return (ack as { id: string }).id;
}

export async function fetchReportStatus(
  reportId: string,
  signal?: AbortSignal,
): Promise<ReportStatus> {
  return apiFetch<ReportStatus>(`/api/v1/reports/${encodeURIComponent(reportId)}`, {
    headers: { Authorization: `Bearer ${readSession()?.token ?? ""}` },
    signal,
  });
}
