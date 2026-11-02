import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { messageForError } from "../../utils/errorMessages";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { fetchReports, resolveReport, type ReportAction, type ReportRow } from "./reportsApi";

/**
 * Loader and action for the staff Reports page. Only platform admins (staff)
 * pass `requireConsoleRole`; everyone else is sent back to /admin. The page
 * settles on its own so a failed load is a retry line, never a blank screen.
 */

export type ReportsData = { state: "ok"; rows: ReportRow[] } | { state: "failed" };

export async function adminReportsLoader({ request }: LoaderFunctionArgs): Promise<ReportsData> {
  try {
    const { token } = await requireConsoleRole(request, ["staff"]);
    return { state: "ok", rows: await fetchReports(token, request.signal) };
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

export type ReportActionResult =
  | { state: "done"; reportId: string; action: ReportAction }
  | { state: "error"; reportId: string; message: string };

const ACTIONS: readonly ReportAction[] = ["hide", "dismiss"];

function isAction(value: unknown): value is ReportAction {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

export async function adminReportsAction({
  request,
}: ActionFunctionArgs): Promise<ReportActionResult> {
  // Kept outside the try so every failure can say which row it belongs to.
  let reportId = "";
  try {
    const { token } = await requireConsoleRole(request, ["staff"]);
    const form = await request.formData();
    const submittedId = form.get("reportId");
    const action = form.get("action");
    reportId = typeof submittedId === "string" ? submittedId : "";

    if (reportId.length === 0 || !isAction(action)) {
      return {
        state: "error",
        reportId,
        message: "That action could not be sent. Refresh the page and try again.",
      };
    }

    await resolveReport(token, reportId, action, request.signal);
    return { state: "done", reportId, action };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "error", reportId, message: messageForError(error) };
  }
}
