import { apiFetch } from "../../services/api";

/**
 * Client for the console's job activity feed (GET /notifications). The feed
 * is recipient-scoped by the backend — an owner sees the alerts about their
 * company's jobs, an employee sees theirs. Only `job.*` events are kept —
 * the feed is the job activity feed, and a new non-job event belongs to a
 * feed of its own. The payload is free-form JSON, so every read is
 * defensive; a known event whose payload lacks a field falls back to a
 * plain-English word, never a guessed name.
 */

export interface NotificationRow {
  id: string;
  /** The job the alert is about, when the alert has one. */
  jobId: string | null;
  /** Wire event name, e.g. "job.submitted". */
  eventType: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

const BAD_FEED = "The notification list did not look as expected.";

export async function fetchNotifications(
  token: string,
  signal?: AbortSignal,
): Promise<NotificationRow[]> {
  const page = await apiFetch<unknown>("/api/v1/notifications?limit=20", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (page === null || typeof page !== "object" || !("data" in page)) {
    throw new Error(BAD_FEED);
  }
  const rows = (page as { data: unknown }).data;
  if (!Array.isArray(rows)) throw new Error(BAD_FEED);
  return (rows as unknown[]).filter((row): row is NotificationRow => {
    if (row === null || typeof row !== "object") return false;
    const one = row as Partial<NotificationRow> & Record<string, unknown>;
    // The payload must be a real object too — the feed reads payload fields
    // (job number, names), so a row without one would crash it mid-render.
    const payload = one.payload as unknown;
    return (
      typeof one.id === "string" &&
      typeof one.eventType === "string" &&
      one.eventType.startsWith("job.") &&
      payload !== null &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      typeof one.createdAt === "string"
    );
  });
}

/** One string from a notification payload, or a fallback. */
export function payloadText(row: NotificationRow, key: string): string | null {
  const value = row.payload[key];
  return typeof value === "string" && value !== "" ? value : null;
}
