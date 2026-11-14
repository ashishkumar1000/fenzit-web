import { redirect, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession } from "../../services/session";
import { consoleRole, isAuthError, requireConsoleRole, type ConsoleRole } from "./adminLoader";
import { fetchJobDetail, type JobDetail } from "./jobDetailApi";

/**
 * Loader for one job's detail page — a common page: the owner reads any job
 * in the company, an employee reads only jobs assigned to them (the backend
 * answers others' jobs with 404, which this loader renders as "not
 * available"). One load, one call; a failure is a message with a way back,
 * never a blank screen.
 */

export type JobDetailData =
  | { state: "ok"; role: ConsoleRole; job: JobDetail }
  | { state: "failed"; role: ConsoleRole; reason: "not-found" | "error" };

export async function adminJobDetailLoader({
  request,
  params,
}: LoaderFunctionArgs): Promise<JobDetailData> {
  const jobId = typeof params.jobId === "string" ? params.jobId : "";
  // The failure copy speaks to the reader's role, so it rides every variant.
  let role: ConsoleRole = "member";
  try {
    const { token, me } = await requireConsoleRole(request, ["owner", "member"]);
    role = consoleRole(me);
    if (jobId === "") return { state: "failed", role, reason: "not-found" };
    return { state: "ok", role, job: await fetchJobDetail(token, jobId, request.signal) };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return {
      state: "failed",
      role,
      reason: error instanceof ApiError && error.status === 404 ? "not-found" : "error",
    };
  }
}
