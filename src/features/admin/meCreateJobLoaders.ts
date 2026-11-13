import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { messageForError } from "../../utils/errorMessages";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { createMyJob, type CreatedJob, type MyNewJob } from "./myJobsApi";
import { fetchCustomerOptions, fetchSkillOptions, type PickOption } from "./approvalApi";
import type { Slice } from "./slice";
import { settle } from "./slice";

/**
 * Loader and action for the employee's "New job" page (Epic 22, CAP-2):
 * create a job for an existing customer, or a new customer and the job in
 * one flow. The backend decides pending-vs-assigned from the caller's own
 * switches; the page only shows the outcome.
 *
 * A caller without the create switch gets a plain refusal before any form
 * renders — and the endpoint refuses again server-side, so the page can
 * never be the guard.
 */

export type NewJobFormData =
  | {
      state: "ok";
      canCreateJobs: boolean;
      userId: string;
      skills: Slice<PickOption[]>;
      customers: Slice<PickOption[]>;
      /** The create's idempotency key, minted once and reused until a create
       *  succeeds — a retry after a lost response cannot mint a second job. */
      idempotencyKey: string;
    }
  | { state: "failed" };

const KEY_STORE = "fenzit.newjob.idempotencyKey";

function readIdempotencyKey(): string {
  try {
    const existing = sessionStorage.getItem(KEY_STORE);
    if (existing !== null && existing !== "") return existing;
    const key = crypto.randomUUID();
    sessionStorage.setItem(KEY_STORE, key);
    return key;
  } catch {
    // Storage unavailable (private mode) — degrade to per-attempt keys; the
    // double-submit button guard still holds.
    return crypto.randomUUID();
  }
}

/** The submission succeeded, so the next create must be a new submission. */
export function clearIdempotencyKey(): void {
  try {
    sessionStorage.removeItem(KEY_STORE);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}

export async function meCreateJobLoader({ request }: LoaderFunctionArgs): Promise<NewJobFormData> {
  try {
    const { token, me } = await requireConsoleRole(request, ["member"]);
    if (me.canCreateJobs !== true) {
      // No form for a caller who cannot use it — the endpoint would refuse.
      return {
        state: "ok",
        canCreateJobs: false,
        userId: me.id,
        skills: { ok: false },
        customers: { ok: false },
        idempotencyKey: "",
      };
    }
    const [skills, customers] = await Promise.all([
      settle(() => fetchSkillOptions(token, request.signal)),
      settle(() => fetchCustomerOptions(token, request.signal)),
    ]);
    return {
      state: "ok",
      canCreateJobs: true,
      userId: me.id,
      skills,
      customers,
      idempotencyKey: readIdempotencyKey(),
    };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    // Same failed-state pattern as every sibling loader: the page shows its
    // own retry instead of the router's bare error screen.
    return { state: "failed" };
  }
}

export type CreateJobResult =
  | { state: "done"; job: CreatedJob; pendingApproval: boolean }
  | { state: "error"; message: string };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function meCreateJobAction({ request }: ActionFunctionArgs): Promise<CreateJobResult> {
  try {
    const { token, me } = await requireConsoleRole(request, ["member"]);
    const form = await request.formData();
    const scheduledStartRaw = text(form, "scheduledStart");
    if (me.id === "" || scheduledStartRaw === "") {
      return { state: "error", message: "That could not be sent. Fill the form and try again." };
    }
    const scheduledStart = new Date(scheduledStartRaw);
    if (Number.isNaN(scheduledStart.getTime())) {
      return {
        state: "error",
        message: "That start time did not read as a real time. Check it and try again.",
      };
    }

    const job: MyNewJob = {
      technicianId: me.id,
      skillId: text(form, "skillId"),
      serviceLocation: text(form, "serviceLocation"),
      scheduledStart: scheduledStart.toISOString(),
      description: text(form, "description"),
    };
    if (job.description === "") {
      return { state: "error", message: "Describe the work first." };
    }
    const priority = text(form, "priority");
    if (priority !== "") job.priority = priority;
    const scheduledEndRaw = text(form, "scheduledEnd");
    if (scheduledEndRaw !== "") {
      const end = new Date(scheduledEndRaw);
      if (Number.isNaN(end.getTime())) {
        return {
          state: "error",
          message: "That end time did not read as a real time. Check it and try again.",
        };
      }
      if (end.getTime() <= scheduledStart.getTime()) {
        return { state: "error", message: "The end time must come after the start time." };
      }
      job.scheduledEnd = end.toISOString();
    }
    const notes = text(form, "notesForTechnician");
    if (notes !== "") job.notesForTechnician = notes;

    if (form.get("customerKind") === "new") {
      const name = text(form, "newCustomerName");
      const phone = text(form, "newCustomerPhone").replace(/\s+/g, "");
      if (name === "" || !/^\d{6,15}$/.test(phone)) {
        return {
          state: "error",
          message: "A new customer needs a name and a 6–15 digit phone number.",
        };
      }
      job.newCustomer = { name, countryCode: "+91", phoneNumber: phone };
      const address = text(form, "newCustomerAddress");
      if (address !== "") job.newCustomer.address = address;
      const city = text(form, "newCustomerCity");
      if (city !== "") job.newCustomer.city = city;
    } else {
      const customerId = text(form, "customerId");
      if (customerId === "") {
        return { state: "error", message: "Pick a customer first." };
      }
      job.customerId = customerId;
    }
    if (job.skillId === "") {
      return { state: "error", message: "Pick a skill first." };
    }
    if (job.serviceLocation === "") {
      return { state: "error", message: "Say where the work happens." };
    }

    // The idempotency key rides the form (minted by the loader, reused across
    // retries of the same submission), so the backend's 24-hour replay cannot
    // turn a lost response into a second job.
    const formKey = form.get("idempotencyKey");
    const idempotencyKey =
      typeof formKey === "string" && formKey !== "" ? formKey : readIdempotencyKey();
    const created = await createMyJob(token, job, idempotencyKey, request.signal);
    clearIdempotencyKey();
    return {
      state: "done",
      job: created,
      pendingApproval: created.status === "pending_approval",
    };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "error", message: messageForError(error) };
  }
}
