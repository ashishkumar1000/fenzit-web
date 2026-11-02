import { apiFetch } from "../../services/api";

/**
 * Clients for the staff account-deletion queue. The backend owns every rule:
 * who may read the queue (platform admin only), that a request can be
 * resolved once, and that nobody resolves their own request. This file only
 * types what the reviewer screen shows.
 */

export type DeletionResolveAction = "complete" | "reject";

export interface DeletionRequestRow {
  id: string;
  userId: string;
  name: string | null;
  countryCode: string;
  phoneNumber: string;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
}

/** The open queue, oldest first. The BE returns at most 50 rows. */
export async function fetchDeletionRequests(
  token: string,
  signal?: AbortSignal,
): Promise<DeletionRequestRow[]> {
  return apiFetch<DeletionRequestRow[]>("/api/v1/admin/account-deletion-requests?status=open", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export interface DeletionResolveResult {
  id: string;
  status: string;
}

export async function resolveDeletionRequest(
  token: string,
  requestId: string,
  action: DeletionResolveAction,
  signal?: AbortSignal,
): Promise<DeletionResolveResult> {
  return apiFetch<DeletionResolveResult>(
    `/api/v1/admin/account-deletion-requests/${encodeURIComponent(requestId)}/resolve`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
      signal,
    },
  );
}
