import { redirect, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import {
  fetchCustomers,
  fetchHolidays,
  fetchJobs,
  fetchMembers,
  fetchMonthly,
  type CustomerRow,
  type HolidayRow,
  type JobRow,
  type MemberRow,
  type MonthlyEmployeeRow,
} from "./companyApi";

/**
 * Loaders for the owner's full-list pages. Every endpoint already exists and
 * is granted to company_admin; each page settles on its own so a failure is
 * a retry line, never a blank screen.
 */

export type BrowseFail = { state: "failed" };

function isoToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

export type CustomersData =
  | {
      state: "ok";
      rows: CustomerRow[];
      nextCursor: string | null;
      requested: string | null;
    }
  | BrowseFail;

export async function adminCustomersLoader({
  request,
}: LoaderFunctionArgs): Promise<CustomersData> {
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    const requested = new URL(request.url).searchParams.get("cursor");
    const page = await fetchCustomers(token, requested, request.signal);
    return { state: "ok", rows: page.data, nextCursor: page.nextCursor, requested };
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

export type JobsData = { state: "ok"; rows: JobRow[] } | BrowseFail;

export async function adminJobsLoader({ request }: LoaderFunctionArgs): Promise<JobsData> {
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    return { state: "ok", rows: await fetchJobs(token, request.signal) };
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

export type EmployeesData = { state: "ok"; rows: MemberRow[] } | BrowseFail;

export async function adminEmployeesLoader({
  request,
}: LoaderFunctionArgs): Promise<EmployeesData> {
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    return { state: "ok", rows: await fetchMembers(token, request.signal) };
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

export type HolidaysData = { state: "ok"; rows: HolidayRow[] } | BrowseFail;

export async function adminHolidaysLoader({ request }: LoaderFunctionArgs): Promise<HolidaysData> {
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    return { state: "ok", rows: await fetchHolidays(token, request.signal) };
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

export type AttendanceData =
  { state: "ok"; from: string; to: string; rows: MonthlyEmployeeRow[] } | BrowseFail;

/** The running month's per-employee summary — the month is computed on the
 *  client (the console is a staff tool, not a public page). */
export async function adminAttendanceLoader({
  request,
}: LoaderFunctionArgs): Promise<AttendanceData> {
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    const to = isoToday();
    const from = `${to.slice(0, 7)}-01`;
    const month = await fetchMonthly(token, from, to, request.signal);
    return { state: "ok", from: month.from, to: month.to, rows: month.employees };
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
