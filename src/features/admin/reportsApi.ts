import { apiFetch } from "../../services/api";

/**
 * Clients for the staff photo-report queue. The backend owns every rule:
 * who may read the queue (platform admin only), what a hide does, and the
 * 409 when a report was already handled. This file only types what the
 * reviewer screen shows.
 */

export type ReportReason = "inappropriate" | "harassment" | "spam" | "other";

export type ReportAction = "hide" | "dismiss";

export interface ReportRow {
  id: string;
  jobId: string;
  attachmentId: string;
  reason: ReportReason;
  note: string | null;
  status: "open" | "hidden" | "dismissed";
  photoHidden: boolean;
  /** Null when the photo link could not be made. The screen shows a plain message. */
  photoUrl: string | null;
  createdAt: string;
}

export async function fetchReports(token: string, signal?: AbortSignal): Promise<ReportRow[]> {
  return apiFetch<ReportRow[]>("/api/v1/admin/attachment-reports?status=open", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export interface ResolveResult {
  id: string;
  status: "hidden" | "dismissed";
}

export async function resolveReport(
  token: string,
  reportId: string,
  action: ReportAction,
  signal?: AbortSignal,
): Promise<ResolveResult> {
  return apiFetch<ResolveResult>(
    `/api/v1/admin/attachment-reports/${encodeURIComponent(reportId)}/resolve`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
      signal,
    },
  );
}
