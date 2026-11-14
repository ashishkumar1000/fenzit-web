import { apiFetch } from "../../services/api";

/**
 * Clients for the owner's approval queue and the pending-job actions on it
 * (Epic 22, CAP-5 / CAP-10). The backend owns every rule — who may decide,
 * which fields an owner may edit while a job is pending, and the 409 when the
 * job has already been decided. This file only types the requests.
 *
 * Documented failures: 401 (no session) · 403 (queue and decisions need a
 * company admin) · 404 (job not in this company) · 409 JOB_NOT_PENDING
 * (already approved or rejected) · 422 (bad filter or bad edit).
 */

/** One queue row — a pending job's decision-relevant summary. */
export interface ApprovalQueueItem {
  id: string;
  jobNumber: string;
  submittedAt: string;
  /** Whole hours since the job was submitted. */
  ageHours: number;
  /** The employee who created the job, when still resolvable. */
  employee: { id: string; name: string | null } | null;
  customerName: string | null;
  /** The work itself, as the employee described it. */
  description: string | null;
  /** When the work was scheduled — the row answers "who, for whom, when". */
  scheduledStart: string | null;
}

export interface ApprovalQueuePage {
  data: ApprovalQueueItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function fetchApprovalQueue(
  token: string,
  filters: { employeeId?: string; olderThanHours?: number; cursor?: string },
  signal?: AbortSignal,
): Promise<ApprovalQueuePage> {
  const params = new URLSearchParams();
  if (filters.employeeId !== undefined && filters.employeeId !== "") {
    params.set("employeeId", filters.employeeId);
  }
  if (filters.olderThanHours !== undefined) {
    params.set("olderThanHours", String(filters.olderThanHours));
  }
  if (filters.cursor !== undefined && filters.cursor !== "") {
    params.set("cursor", filters.cursor);
  }
  const query = params.size > 0 ? `?${params.toString()}` : "";
  return apiFetch<ApprovalQueuePage>(`/api/v1/approval-queue${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** The owner's decision on a pending job. Reject may carry a reason. */
export async function decidePendingJob(
  token: string,
  jobId: string,
  decision: { decision: "approve" | "reject"; reason?: string },
  signal?: AbortSignal,
): Promise<void> {
  await apiFetch<void>(`/api/v1/jobs/${encodeURIComponent(jobId)}/approval`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(decision),
    signal,
  });
}

/** The job's own fields, as the edit form needs them. */
export interface PendingJobDetail {
  id: string;
  jobNumber: string;
  customerId: string;
  technicianId: string | null;
  serviceLocation: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  status: string;
  priority: string | null;
  description: string;
  notesForTechnician: string | null;
  skill: { id: string; name: string } | null;
  customerName: string | null;
  technicianName: string | null;
}

export async function fetchJobForEdit(
  token: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<PendingJobDetail> {
  const detail = await apiFetch<unknown>(`/api/v1/jobs/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  // The detail endpoint returns the job flat; read defensively and narrow.
  const row = (
    detail !== null && typeof detail === "object" && "job" in detail
      ? (detail as { job: unknown }).job
      : detail
  ) as Record<string, unknown> | null;
  if (row === null || typeof row !== "object") {
    throw new Error("The job detail did not look as expected.");
  }
  const read = (key: string): unknown => row[key];
  const readString = (key: string): string | null => {
    const value = read(key);
    return typeof value === "string" ? value : null;
  };
  const skill = read("skill");
  const technician = read("technician");
  const customer = read("customer");
  const id = readString("id");
  if (id === null || id === "") {
    // An edit form holding a job with no id would save against /api/v1/jobs/
    // — fail the load instead of the save.
    throw new Error("The job detail did not look as expected.");
  }
  return {
    id,
    jobNumber: readString("jobNumber") ?? "",
    customerId: readString("customerId") ?? "",
    technicianId: readString("technicianId"),
    serviceLocation: readString("serviceLocation") ?? "",
    scheduledStart: readString("scheduledStart") ?? "",
    scheduledEnd: readString("scheduledEnd"),
    status: readString("status") ?? "",
    priority: readString("priority"),
    description: readString("description") ?? "",
    notesForTechnician: readString("notesForTechnician"),
    skill:
      skill !== null && typeof skill === "object" && "id" in skill
        ? {
            id: String((skill as unknown as { id: unknown }).id ?? ""),
            name: String((skill as unknown as { name: unknown }).name ?? ""),
          }
        : null,
    customerName:
      customer !== null && typeof customer === "object" && "name" in customer
        ? (((customer as unknown as { name: unknown }).name as string | null) ?? null)
        : null,
    technicianName:
      technician !== null && typeof technician === "object" && "name" in technician
        ? (((technician as unknown as { name: unknown }).name as string | null) ?? null)
        : null,
  };
}

/** One option of a picker on the edit form. */
export interface PickOption {
  id: string;
  name: string;
}

/** The fields an owner may change on a pending job (CAP-5). Each key is
 *  omitted when the form leaves it untouched, so the save edits only what
 *  the owner changed. */
export interface PendingJobEdit {
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string | null;
  notesForTechnician?: string | null;
  technicianId?: string | null;
  priority?: string;
  serviceLocation?: string;
  skillId?: string | null;
  customerId?: string;
}

export async function updatePendingJob(
  token: string,
  jobId: string,
  edit: PendingJobEdit,
  signal?: AbortSignal,
): Promise<void> {
  await apiFetch<void>(`/api/v1/jobs/${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(edit),
    signal,
  });
}

/** The global skills catalog, for the edit form's skill picker. The endpoint
 *  wraps the list: `{ skills: [...] }`. */
export async function fetchSkillOptions(
  token: string,
  signal?: AbortSignal,
): Promise<PickOption[]> {
  const payload = await apiFetch<unknown>("/api/v1/skills", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const rows =
    payload !== null && typeof payload === "object" && "skills" in payload
      ? (payload as { skills: unknown }).skills
      : payload;
  if (!Array.isArray(rows)) {
    throw new Error("The skill list did not look as expected.");
  }
  return (rows as Array<Record<string, unknown>>)
    .map((row) => ({ id: String(row["id"] ?? ""), name: String(row["name"] ?? "") }))
    .filter((row) => row.id !== "" && row.name !== "");
}

/** The customers list, first page, for the edit form's customer picker. */
export async function fetchCustomerOptions(
  token: string,
  signal?: AbortSignal,
): Promise<PickOption[]> {
  const page = await apiFetch<{ data: Array<Record<string, unknown>> }>(
    "/api/v1/customers?limit=50",
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
  // Same shape check as the skill list — a malformed page is an error, not a
  // silent empty picker.
  if (!Array.isArray(page.data)) {
    throw new Error("The customer list did not look as expected.");
  }
  return page.data
    .map((row) => ({ id: String(row["id"] ?? ""), name: String(row["name"] ?? "") }))
    .filter((row) => row.id !== "" && row.name !== "");
}
