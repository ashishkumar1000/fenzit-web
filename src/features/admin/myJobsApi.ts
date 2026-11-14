import { apiFetch } from "../../services/api";
import type { ApprovalQueueItem } from "./approvalApi";

/**
 * Clients for the employee's own job actions on the web console (Epic 22,
 * CAP-2/CAP-4): my pending submissions, and creating a job of my own. The
 * backend owns every rule — it refuses a caller without the create switch,
 * refuses a job for anyone but the caller, and decides whether the new job
 * waits for approval or is assigned at once.
 *
 * Documented failures: 401 (no session) · 403 (creation not allowed) ·
 * 404 (customer not found) · 422 (bad input, reused idempotency key).
 */

export interface MyPendingPage {
  data: ApprovalQueueItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** My submissions that wait for the owner's decision, oldest first. */
export function fetchMyPendingJobs(token: string, signal?: AbortSignal): Promise<MyPendingPage> {
  return apiFetch<MyPendingPage>("/api/v1/approval-queue/mine?limit=50", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** The fields of a job set on the web create form. A member always assigns
 *  themself (the backend refuses anyone else); an owner names any active
 *  employee — the backend enforces who may assign whom. */
export interface MyNewJob {
  technicianId: string;
  skillId: string;
  /** Exactly one of customerId / newCustomer. */
  customerId?: string;
  newCustomer?: {
    name: string;
    countryCode: string;
    phoneNumber: string;
    address?: string;
    city?: string;
  };
  serviceLocation: string;
  scheduledStart: string;
  scheduledEnd?: string;
  /** The same creator-settable fields the mobile form and the owner's edit
   *  form carry (CAP-2: the same record, the same fields). */
  description: string;
  priority?: string;
  notesForTechnician?: string;
}

/** A fresh job as the create response carries it. */
export interface CreatedJob {
  id: string;
  jobNumber: string;
  status: string;
}

export async function createMyJob(
  token: string,
  job: MyNewJob,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<CreatedJob> {
  return apiFetch<CreatedJob>("/api/v1/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(job),
    signal,
  });
}
