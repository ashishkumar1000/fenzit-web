import { redirect, type ActionFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { messageForError } from "../../utils/errorMessages";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { fetchMembers } from "./companyApi";
import {
  decidePendingJob,
  fetchApprovalQueue,
  fetchCustomerOptions,
  fetchJobForEdit,
  fetchSkillOptions,
  updatePendingJob,
  type ApprovalQueuePage,
  type PendingJobDetail,
  type PendingJobEdit,
} from "./approvalApi";
import type { PickOption } from "./approvalApi";
import type { Slice } from "./slice";
import { settle } from "./slice";

/**
 * The owner's approval queue (Epic 22, CAP-5/CAP-10), rendered on the shared
 * jobs page. Filters ride the URL (`?employeeId=&olderThan=`) so they are
 * plain navigation, and `?edit=<jobId>` opens that job's edit form (the
 * loader fetches the job plus the picker options it needs). Every request is
 * owner-gated: the state fetch and the action both go through the caller's
 * token — the jobs loader already role-gated the page.
 */

export interface QueueFilters {
  employeeId: string;
  olderThanHours: number | null;
}

export interface EditBundle {
  job: PendingJobDetail;
  skills: PickOption[];
  /** True when the skill list failed to load — the form says so instead of
   *  showing an empty picker as if it were the whole catalog. */
  skillsFailed: boolean;
  customers: PickOption[];
  customersFailed: boolean;
  technicians: PickOption[];
}

export type ApprovalQueueData =
  | {
      state: "ok";
      filters: QueueFilters;
      queue: Slice<ApprovalQueuePage>;
      members: Slice<Array<{ id: string; name: string | null; role: string }>>;
      edit: Slice<EditBundle> | null;
      editId: string | null;
    }
  | { state: "failed" };

/** The ok half of ApprovalQueueData — what the jobs page's queue section
 *  receives when its slice settled. */
export type QueueState = Extract<ApprovalQueueData, { state: "ok" }>;

/** The queue state without the role gate — the caller (the shared jobs
 *  loader) has already admitted the role and holds the token. */
export async function loadApprovalQueueState(
  request: Request,
  token: string,
): Promise<Extract<ApprovalQueueData, { state: "ok" }>> {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId") ?? "";
  const olderThanRaw = url.searchParams.get("olderThan");
  // The regex keeps "12" style values; the safe-integer bound keeps a
  // hand-edited 400-digit value from becoming Infinity on the wire.
  const olderThanHours =
    olderThanRaw !== null && olderThanRaw !== "" && /^\d+$/.test(olderThanRaw)
      ? Number(olderThanRaw)
      : null;
  const olderThan =
    olderThanHours !== null && Number.isSafeInteger(olderThanHours) && olderThanHours > 0
      ? olderThanHours
      : null;
  const editId = url.searchParams.get("edit");
  const cursor = url.searchParams.get("cursor");

  // The queue, the members filter and the edit job do not depend on each
  // other, so they run in parallel; only the pickers hang off the job.
  const [members, queue, editJob] = await Promise.all([
    settle(() => fetchMembers(token, request.signal)),
    settle(() =>
      fetchApprovalQueue(
        token,
        {
          employeeId: employeeId === "" ? undefined : employeeId,
          olderThanHours: olderThan ?? undefined,
          cursor: cursor ?? undefined,
        },
        request.signal,
      ),
    ),
    editId === null
      ? Promise.resolve(null)
      : settle(() => fetchJobForEdit(token, editId, request.signal)),
  ]);

  let edit: Slice<EditBundle> | null = null;
  if (editId !== null) {
    if (editJob === null || !editJob.ok) {
      edit = { ok: false };
    } else {
      // A failed picker is recorded, not swallowed — the form shows a line
      // so an empty list is never mistaken for "nothing exists".
      const [skills, customers] = await Promise.all([
        settle(() => fetchSkillOptions(token, request.signal)),
        settle(() => fetchCustomerOptions(token, request.signal)),
      ]);
      const roster = members.ok ? members.data : [];
      edit = {
        ok: true,
        data: {
          job: editJob.data,
          skills: skills.ok ? skills.data : [],
          skillsFailed: !skills.ok,
          customers: customers.ok ? customers.data : [],
          customersFailed: !customers.ok,
          technicians: roster
            .filter((m) => m.role === "employee" && m.status === "active")
            .map((m) => ({ id: m.userId, name: m.name ?? "(no name)" })),
        },
      };
    }
  }

  return {
    state: "ok",
    filters: { employeeId, olderThanHours: olderThan },
    queue,
    members: members.ok
      ? {
          ok: true,
          data: members.data.map((m) => ({ id: m.userId, name: m.name, role: m.role })),
        }
      : { ok: false },
    edit,
    editId,
  };
}

export type DecisionResult =
  { state: "done"; jobId: string } | { state: "error"; jobId: string; message: string };

const DECISIONS: readonly string[] = ["approve", "reject"];

/** One action handles both queue verbs: decide (approve/reject) and save an
 *  edit. Each posts `intent` plus the fields it needs. */
export async function approvalQueueAction({
  request,
}: ActionFunctionArgs): Promise<DecisionResult> {
  const form = await request.formData();
  const jobId = typeof form.get("jobId") === "string" ? (form.get("jobId") as string) : "";
  const intent = form.get("intent");

  try {
    const { token } = await requireConsoleRole(request, ["owner"]);

    if (intent === "decide") {
      const decision = form.get("decision");
      if (jobId === "" || typeof decision !== "string" || !DECISIONS.includes(decision)) {
        return { state: "error", jobId, message: "That action could not be sent. Try again." };
      }
      const reason = form.get("reason");
      await decidePendingJob(
        token,
        jobId,
        {
          decision: decision as "approve" | "reject",
          ...(decision === "reject" && typeof reason === "string" && reason.trim() !== ""
            ? { reason: reason.trim() }
            : {}),
        },
        request.signal,
      );
      return { state: "done", jobId };
    }

    if (intent === "edit-save") {
      if (jobId === "") {
        return { state: "error", jobId, message: "That save could not be sent. Try again." };
      }
      // Same validations as the employee's create form: a real start, a real
      // end, and the end after the start. Caught here with plain-English
      // copy — a typo is not a server error.
      const startRaw = form.get("scheduledStart");
      const start = typeof startRaw === "string" && startRaw !== "" ? new Date(startRaw) : null;
      if (start !== null && Number.isNaN(start.getTime())) {
        return {
          state: "error",
          jobId,
          message: "That start time did not read as a real time. Check it and try again.",
        };
      }
      const endRaw = form.get("scheduledEnd");
      const end = typeof endRaw === "string" && endRaw !== "" ? new Date(endRaw) : null;
      if (end !== null && Number.isNaN(end.getTime())) {
        return {
          state: "error",
          jobId,
          message: "That end time did not read as a real time. Check it and try again.",
        };
      }
      if (start !== null && end !== null && end.getTime() <= start.getTime()) {
        return {
          state: "error",
          jobId,
          message: "The end time must come after the start time.",
        };
      }
      await updatePendingJob(token, jobId, editFromBody(form), request.signal);
      return { state: "done", jobId };
    }

    return { state: "error", jobId, message: "That action could not be sent. Try again." };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "error", jobId, message: messageForError(error) };
  }
}

/** Read the edit form into a patch of only the fields the form carries. */
function editFromBody(form: FormData): PendingJobEdit {
  const text = (key: string): string | undefined => {
    const value = form.get(key);
    return typeof value === "string" ? value : undefined;
  };
  const edit: PendingJobEdit = {};
  const description = text("description");
  if (description !== undefined) edit.description = description;
  const scheduledStart = text("scheduledStart");
  if (scheduledStart) edit.scheduledStart = new Date(scheduledStart).toISOString();
  const scheduledEnd = text("scheduledEnd");
  if (scheduledEnd !== undefined) {
    edit.scheduledEnd = scheduledEnd === "" ? null : new Date(scheduledEnd).toISOString();
  }
  const notes = text("notesForTechnician");
  if (notes !== undefined) edit.notesForTechnician = notes.trim() === "" ? null : notes;
  const technicianId = text("technicianId");
  if (technicianId !== undefined) edit.technicianId = technicianId === "" ? null : technicianId;
  const priority = text("priority");
  if (priority !== undefined && priority !== "") edit.priority = priority;
  const serviceLocation = text("serviceLocation");
  if (serviceLocation !== undefined) edit.serviceLocation = serviceLocation;
  const skillId = text("skillId");
  if (skillId !== undefined) edit.skillId = skillId === "" ? null : skillId;
  const customerId = text("customerId");
  if (customerId !== undefined && customerId !== "") edit.customerId = customerId;
  return edit;
}
