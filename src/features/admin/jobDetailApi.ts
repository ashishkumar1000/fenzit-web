import { apiFetch } from "../../services/api";
import type { WorkflowStep } from "./companyApi";

/**
 * Client for one job's detail (GET /jobs/:id). The owner reads any job in the
 * company; an employee reads only jobs assigned to them (others answer 404,
 * never 403 — the backend decides, this file only types). Every embedded
 * person, the timeline and the signed attachment URLs come from this one call.
 *
 * Documented failures: 401 (no session) · 404 (not in this company, or an
 * employee's job they are not assigned to) · 409 (a read never 409s; the
 * endpoint's 409s belong to writes on the same route).
 */

export interface JobDetail {
  id: string;
  jobNumber: string;
  status: string;
  priority: string | null;
  serviceLocation: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  completedAt: string | null;
  description: string | null;
  notesForTechnician: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  currentStep: string | null;
  currentStepIndex: number | null;
  skill: { id: string; name: string } | null;
  /** The assignee's profile (detail responses upgrade it beyond the list's
   *  name-only embed; absent fields stay null). */
  technician: {
    id: string;
    name: string | null;
    countryCode: string | null;
    phoneNumber: string | null;
    skills: string[];
  } | null;
  customer: {
    id: string;
    name: string;
    countryCode: string | null;
    phoneNumber: string | null;
    address: string | null;
    formattedAddress: string | null;
  } | null;
  /** Oldest first, as the server returns it. */
  activityLog: Array<{
    id: string;
    eventType: string;
    actorName: string | null;
    createdAt: string;
  }>;
  /** Presigned URLs live one hour; `url` is null when signing failed. */
  attachments: Array<{
    id: string;
    type: string;
    url: string | null;
    createdAt: string;
  }>;
  workflowTemplate: { version: number; steps: WorkflowStep[] } | null;
}

const BAD_DETAIL = "The job detail did not look as expected.";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function str(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function person(value: unknown): {
  id: string;
  name: string | null;
  countryCode: string | null;
  phoneNumber: string | null;
} | null {
  if (!isObject(value)) return null;
  const id = str(value, "id");
  if (id === null || id === "") return null;
  return {
    id,
    name: str(value, "name"),
    countryCode: str(value, "countryCode"),
    phoneNumber: str(value, "phoneNumber"),
  };
}

export async function fetchJobDetail(
  token: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<JobDetail> {
  const payload = await apiFetch<unknown>(`/api/v1/jobs/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  // The endpoint returns the job flat; some callers have seen a `{ job }`
  // wrapper — unwrap defensively, same as the edit form's client.
  const row =
    payload !== null && isObject(payload) && "job" in payload ? (payload.job as unknown) : payload;
  if (!isObject(row)) throw new Error(BAD_DETAIL);
  const id = str(row, "id");
  const jobNumber = str(row, "jobNumber");
  if (id === null || id === "" || jobNumber === null || jobNumber === "") {
    throw new Error(BAD_DETAIL);
  }
  const skill = row["skill"];
  const customerValue = row["customer"];
  const log = row["activityLog"];
  const attachments = row["attachments"];
  const template = row["workflowTemplate"];
  const technicianValue = row["technician"];
  const tech = person(technicianValue);
  const techSkills =
    isObject(technicianValue) && Array.isArray(technicianValue.skills)
      ? (technicianValue.skills as unknown[]).filter((s): s is string => typeof s === "string")
      : [];
  const steps =
    isObject(template) && Array.isArray(template.steps)
      ? (template.steps as unknown[]).filter(isObject).map((step) => ({
          key: str(step, "key") ?? "",
          label: str(step, "label") ?? "",
          requiresPhoto: step["requiresPhoto"] === true,
          requiresSignature: step["requiresSignature"] === true,
          setsStatus: str(step, "setsStatus"),
        }))
      : null;
  return {
    id,
    jobNumber,
    status: str(row, "status") ?? "",
    priority: str(row, "priority"),
    serviceLocation: str(row, "serviceLocation") ?? "",
    scheduledStart: str(row, "scheduledStart") ?? "",
    scheduledEnd: str(row, "scheduledEnd"),
    completedAt: str(row, "completedAt"),
    description: str(row, "description"),
    notesForTechnician: str(row, "notesForTechnician"),
    decidedAt: str(row, "decidedAt"),
    rejectionReason: str(row, "rejectionReason"),
    createdAt: str(row, "createdAt") ?? "",
    currentStep: str(row, "currentStep"),
    currentStepIndex:
      typeof row["currentStepIndex"] === "number" && Number.isFinite(row["currentStepIndex"])
        ? (row["currentStepIndex"] as number)
        : null,
    skill:
      isObject(skill) && str(skill, "name") !== null
        ? { id: str(skill, "id") ?? "", name: str(skill, "name") ?? "" }
        : null,
    technician: tech !== null ? { ...tech, skills: techSkills } : null,
    customer:
      isObject(customerValue) && str(customerValue, "name") !== null
        ? {
            id: str(customerValue, "id") ?? "",
            name: str(customerValue, "name") ?? "",
            countryCode: str(customerValue, "countryCode"),
            phoneNumber: str(customerValue, "phoneNumber"),
            address: str(customerValue, "address"),
            formattedAddress: str(customerValue, "formattedAddress"),
          }
        : null,
    activityLog: Array.isArray(log)
      ? (log as unknown[]).filter(isObject).map((entry) => ({
          id: str(entry, "id") ?? "",
          eventType: str(entry, "eventType") ?? "",
          actorName: str(entry, "actorName"),
          createdAt: str(entry, "createdAt") ?? "",
        }))
      : [],
    attachments: Array.isArray(attachments)
      ? (attachments as unknown[]).filter(isObject).map((one) => ({
          id: str(one, "id") ?? "",
          type: str(one, "type") ?? "",
          url: str(one, "url"),
          createdAt: str(one, "createdAt") ?? "",
        }))
      : [],
    workflowTemplate:
      steps !== null
        ? {
            // The template's own version from the wire; 0 only when the
            // backend omits it. Never a fabricated value for a real one.
            version:
              isObject(template) && typeof template.version === "number" ? template.version : 0,
            steps,
          }
        : null,
  };
}
