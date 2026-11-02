import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession } from "../../services/session";
import { messageForError } from "../../utils/errorMessages";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import {
  fetchDeletionRequests,
  resolveDeletionRequest,
  type DeletionRequestRow,
  type DeletionResolveAction,
} from "./deletionRequestsApi";

/**
 * Loader and action for the staff Deletion requests page. Only platform admins
 * (staff) pass `requireConsoleRole`; everyone else goes back to /admin. The page
 * settles on its own, so a failed load is a retry line, never a blank screen.
 */

export type DeletionQueueData = { state: "ok"; rows: DeletionRequestRow[] } | { state: "failed" };

export async function adminDeletionLoader({
  request,
}: LoaderFunctionArgs): Promise<DeletionQueueData> {
  try {
    const { token } = await requireConsoleRole(request, ["staff"]);
    return { state: "ok", rows: await fetchDeletionRequests(token, request.signal) };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed" };
  }
}

export type DeletionActionResult =
  | { state: "done"; requestId: string; action: DeletionResolveAction }
  | { state: "error"; requestId: string; message: string };

const ACTIONS: readonly DeletionResolveAction[] = ["complete", "reject"];

function isAction(value: unknown): value is DeletionResolveAction {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

export async function adminDeletionAction({
  request,
}: ActionFunctionArgs): Promise<DeletionActionResult> {
  // Kept outside the try so every failure can say which row it belongs to.
  let requestId = "";
  try {
    const { token } = await requireConsoleRole(request, ["staff"]);
    const form = await request.formData();
    const submittedId = form.get("requestId");
    const action = form.get("action");
    requestId = typeof submittedId === "string" ? submittedId : "";

    if (requestId.length === 0 || !isAction(action)) {
      return {
        state: "error",
        requestId,
        message: "That action could not be sent. Refresh the page and try again.",
      };
    }

    await resolveDeletionRequest(token, requestId, action, request.signal);
    return { state: "done", requestId, action };
  } catch (error) {
    if (error instanceof Response) throw error;
    // Only a 401 ends the sign-in. A 403 (for example, resolving your own request) is a message, not a sign-out.
    if (error instanceof ApiError && error.status === 401) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "error", requestId, message: messageForError(error) };
  }
}
