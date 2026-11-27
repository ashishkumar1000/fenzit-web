import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { ApiError } from "../../services/api";
import { consoleRole, isAuthError, requireConsoleRole } from "./adminLoader";
import { messageForError } from "../../utils/errorMessages";
import { loadApprovalQueueState, type QueueState } from "./approvalLoaders";
import {
  createCustomer,
  fetchCustomersPage,
  fetchJobs,
  fetchJobsPage,
  fetchMembers,
  fetchMembersPage,
  fetchMonthly,
  inviteMember,
  resendInviteSms,
  updateJobSettings,
  type CustomerBucketFilter,
  type CustomersPageResult,
  type CustomersSort,
  type JobRow,
  type JobsPageResult,
  type JobsPriorityFilter,
  type JobsSort,
  type JobsStatusFilter,
  type MembersPageResult,
  type MembersRoleFilter,
  type MembersSort,
  type MembersStatusFilter,
  type MembersJobSettingFilter,
  type MemberRow,
  type MonthlyEmployeeRow,
} from "./companyApi";
import {
  FALLBACK_COUNTRY_CODES,
  fetchCountryCodes,
  type CountryCode,
} from "../../services/countryCodes";

export type { MembersSort, MembersStatusFilter, MembersRoleFilter, MembersJobSettingFilter };
export type { CustomersSort, CustomerBucketFilter };
import { fetchMyPendingJobs } from "./myJobsApi";
import { fetchMyRejectedJobs, type RejectedJobRow } from "./meApi";
import {
  fetchEmployeeReport,
  fetchOwnerReport,
  type EmployeeReportResponse,
  type OwnerPipeline,
} from "./jobReportsApi";
import { fetchNotifications, type NotificationRow } from "./notificationsApi";
import { fetchReportHistory, type ReportHistoryRow, type RosterPerson } from "./jobExportApi";
import type { ApprovalQueueItem } from "./approvalApi";
import { fetchSkillOptions, type PickOption } from "./approvalApi";
import { istEndOfLastMonth, istFirstOfMonth, istShifted, istToday, fmtPhone } from "./format";
import { settle, type Slice } from "./slice";

/**
 * Loaders for the owner's full-list pages. Every endpoint already exists and
 * is granted to company_admin; each page settles on its own so a failure is
 * a retry line, never a blank screen.
 */

export type BrowseFail = { state: "failed" };

export type CustomersData =
  | {
      state: "ok";
      result: CustomersPageResult;
      filters: CustomersFilters;
      /** The signed-in owner's display name for the greeting. */
      selfName: string | null;
      /** Country choices for the add-customer dialog's phone field. */
      countries: CountryCode[];
    }
  | BrowseFail;

/** The Customers page's filters, all carried in the URL — the same contract
 *  as the Employees page: the loader owns the reading and the defaults, so
 *  every link on the page can build a plain address. */
export type CustomersFilters = {
  q: string;
  bucket: CustomerBucketFilter;
  sort: CustomersSort;
  page: number;
  pageSize: number;
};

const BUCKET_FILTERS = new Set(["all", "new", "single", "repeat"]);
const CUSTOMER_SORTS = new Set([
  "created_new",
  "created_old",
  "name_az",
  "name_za",
  "recent_activity",
]);
const CUSTOMER_PAGE_SIZES_SET = new Set([10, 25, 50]);

/** Reads the address into filters; anything unknown falls back to its
 *  default, so a hand-edited URL never breaks the page. */
export function readCustomersFilters(url: URL): CustomersFilters {
  const params = url.searchParams;
  const one = (key: string, allowed: Set<string>, fallback: string): string => {
    const value = params.get(key) ?? "";
    return allowed.has(value) ? value : fallback;
  };
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "10");
  return {
    q: (params.get("q") ?? "").trim().slice(0, 80),
    bucket: one("bucket", BUCKET_FILTERS, "all") as CustomerBucketFilter,
    sort: one("sort", CUSTOMER_SORTS, "created_new") as CustomersSort,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: CUSTOMER_PAGE_SIZES_SET.has(pageSize) ? pageSize : 10,
  };
}

/** The page size the table starts on. The rows-per-page select offers the
 *  sizes the backend accepts (1–100); these three are the sensible ones. */
export const CUSTOMERS_PAGE_SIZES = [10, 25, 50] as const;

/** The Jobs page's filters, all carried in the URL — the same contract as the
 *  Customers page: the loader owns the reading and the defaults, so every
 *  link on the page can build a plain address. `status` "" is All. */
export type JobsFilters = {
  q: string;
  status: JobsStatusFilter;
  /** The skill catalog's id; "" is All. */
  skill: string;
  priority: JobsPriorityFilter;
  sort: JobsSort;
  page: number;
  pageSize: number;
};

const JOB_STATUSES = new Set([
  "",
  "scheduled",
  "in_progress",
  "pending_approval",
  "completed",
  "cancelled",
  "rejected",
]);
const JOB_PRIORITIES = new Set(["", "normal", "urgent"]);
const JOB_SORTS = new Set(["latest", "soonest"]);
const JOBS_PAGE_SIZES_SET = new Set([10, 25, 50]);

/** Reads the address into filters; anything unknown falls back to its
 *  default, so a hand-edited URL never breaks the page. */
export function readJobsFilters(url: URL): JobsFilters {
  const params = url.searchParams;
  const one = (key: string, allowed: Set<string>, fallback: string): string => {
    const value = params.get(key) ?? "";
    return allowed.has(value) ? value : fallback;
  };
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "10");
  return {
    q: (params.get("q") ?? "").trim().slice(0, 80),
    status: one("status", JOB_STATUSES, "") as JobsStatusFilter,
    skill: (params.get("skill") ?? "").trim().slice(0, 64),
    priority: one("priority", JOB_PRIORITIES, "") as JobsPriorityFilter,
    sort: one("sort", JOB_SORTS, "latest") as JobsSort,
    // The top clamp keeps a hand-edited astronomic page inside what the
    // backend accepts (its own 422 ceiling is 10000) — the endpoint then
    // answers an empty page with an honest total, never a 500.
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, 10000) : 1,
    pageSize: JOBS_PAGE_SIZES_SET.has(pageSize) ? pageSize : 10,
  };
}

/** The page size the jobs table starts on — the same three as customers. */
export const JOBS_PAGE_SIZES = [10, 25, 50] as const;

export async function adminCustomersLoader({
  request,
}: LoaderFunctionArgs): Promise<CustomersData> {
  try {
    const { token, me } = await requireConsoleRole(request, ["owner"]);
    const filters = readCustomersFilters(new URL(request.url));
    const [result, countries] = await Promise.all([
      fetchCustomersPage(
        token,
        {
          page: filters.page,
          pageSize: filters.pageSize,
          ...(filters.q !== "" ? { search: filters.q } : {}),
          ...(filters.bucket !== "all" ? { bucket: filters.bucket } : {}),
          ...(filters.sort !== "created_new" ? { sort: filters.sort } : {}),
        },
        request.signal,
      ),
      loadCountries(request),
    ]);
    return { state: "ok", result, filters, selfName: me.name, countries };
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

/** One add-customer from the dialog. The backend mints the code, and the row
 *  appears in the list through the loader's refetch after the action. */
export type CustomerCreateResult =
  | { kind: "create"; state: "done"; customerCode: string }
  | { kind: "create"; state: "error"; message: string };

export type CustomersActionResult = CustomerCreateResult;

/** The Customers page's action: create one customer. A duplicate phone is the
 *  backend's 409 — the error mapping turns it into plain English. */
export async function adminCustomersAction({
  request,
}: ActionFunctionArgs): Promise<CustomersActionResult> {
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent !== "create") {
    return {
      kind: "create",
      state: "error",
      message: "We could not save the customer. Please try again.",
    };
  }
  const name = typeof form.get("name") === "string" ? (form.get("name") as string).trim() : "";
  const countryCode =
    typeof form.get("countryCode") === "string" ? (form.get("countryCode") as string) : "";
  const phoneNumber =
    typeof form.get("phoneNumber") === "string"
      ? (form.get("phoneNumber") as string).replace(/\s+/g, "")
      : "";
  const address =
    typeof form.get("address") === "string" ? (form.get("address") as string).trim() : "";
  const city = typeof form.get("city") === "string" ? (form.get("city") as string).trim() : "";
  if (name === "" || !/^\+\d{1,4}$/.test(countryCode) || !/^\d{6,15}$/.test(phoneNumber)) {
    return {
      kind: "create",
      state: "error",
      message: "Please enter the customer's name and a valid phone number (6 to 15 digits).",
    };
  }
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    const result = await createCustomer(
      token,
      {
        name,
        countryCode,
        phoneNumber,
        ...(address !== "" ? { address } : {}),
        ...(city !== "" ? { city } : {}),
      },
      request.signal,
    );
    return { kind: "create", state: "done", customerCode: result.customerCode };
  } catch (error) {
    // The shared DUPLICATE_RESOURCE line ("This information already exists.")
    // says too little here — a customer's phone IS their identity, so the
    // dialog says which one clashed. Still branching on the code, never the
    // message.
    if (error instanceof ApiError && error.errorCode === "DUPLICATE_RESOURCE") {
      return {
        kind: "create",
        state: "error",
        message: "This phone number is already added as a customer in your company.",
      };
    }
    return withActionError<CustomerCreateResult>(error, request.signal, (message) => ({
      kind: "create",
      state: "error",
      message,
    }));
  }
}

/** The jobs page's tabs. The page's panels each live on one tab, and the
 *  loader fetches only the active tab's data — a tab change is navigation,
 *  so nothing the user is not looking at is asked of the backend. */
export type JobsTab = "jobs" | "approval" | "activity" | "report" | "rejected";

/** One tab's data, per role. Every variant carries `role` and `tab` so the
 *  page can render the tab strip even on a failed load. */
export type JobsData =
  | { state: "failed"; role: "owner" | "member"; tab: JobsTab }
  | {
      state: "ok";
      role: "owner";
      tab: "jobs";
      /** One DB-paged page of the company's jobs — filters ride the URL. */
      result: JobsPageResult;
      filters: JobsFilters;
      /** The signed-in owner's display name for the greeting. */
      selfName: string | null;
      /** The skill catalog for the filter dropdown; a catalog failure
       *  degrades to an empty dropdown, never a failed page. */
      skills: Slice<PickOption[]>;
      pipeline: Slice<OwnerPipeline>;
    }
  | {
      state: "ok";
      role: "owner";
      tab: "approval";
      queue: Slice<QueueState>;
      /** The signed-in owner's display name for the greeting. */
      selfName: string | null;
      /** Fetched on every owner tab so the Approval tab can badge its
       *  waiting count without opening it. */
      pipeline: Slice<OwnerPipeline>;
    }
  | {
      state: "ok";
      role: "owner";
      tab: "activity";
      activity: Slice<NotificationRow[]>;
      selfName: string | null;
      pipeline: Slice<OwnerPipeline>;
    }
  | {
      state: "ok";
      role: "owner";
      tab: "report";
      history: Slice<ReportHistoryRow[]>;
      employees: Slice<RosterPerson[]>;
      selfName: string | null;
      pipeline: Slice<OwnerPipeline>;
    }
  | {
      state: "ok";
      role: "member";
      tab: "jobs";
      rows: JobRow[];
      status: string;
      selfName: string | null;
      canCreateJobs: boolean;
      jobApprovalRequired: boolean;
      pending: Slice<ApprovalQueueItem[]>;
      pendingMore: boolean;
    }
  | {
      state: "ok";
      role: "member";
      tab: "report";
      report: Slice<EmployeeReportResponse>;
      reportPreset: string;
      selfName: string | null;
    }
  | {
      state: "ok";
      role: "member";
      tab: "rejected";
      rejected: Slice<RejectedJobRow[]>;
      rejectedMore: boolean;
      rejectedNext: string | null;
      /** The activity period, kept for the rejected-history's paging link. */
      reportPreset: string;
      selfName: string | null;
    }
  | {
      state: "ok";
      role: "member";
      tab: "activity";
      activity: Slice<NotificationRow[]>;
      selfName: string | null;
    };

/** The tab a jobs-page address names — the first tab when the address is
 *  bare. Old deep links keep working: the queue's own params imply the
 *  approval tab, the member report's period implies the report tab, and the
 *  rejected history's cursor implies the rejected tab. */
function resolveJobsTab(request: Request, isOwner: boolean): JobsTab {
  const params = new URL(request.url).searchParams;
  const OWNER_TABS = new Set(["jobs", "approval", "activity", "report"]);
  const MEMBER_TABS = new Set(["jobs", "report", "rejected", "activity"]);
  const requested = params.get("tab") ?? "";
  if (isOwner && OWNER_TABS.has(requested)) return requested as JobsTab;
  if (!isOwner && MEMBER_TABS.has(requested)) return requested as JobsTab;
  const implies: Array<[string, JobsTab]> = isOwner
    ? [
        ["edit", "approval"],
        ["employeeId", "approval"],
        ["olderThan", "approval"],
        ["cursor", "approval"],
      ]
    : [
        // The rejected cursor before the range: a link may carry both (the
        // rejected history keeps the activity period beside its cursor), and
        // the cursor is the more specific intent.
        ["rejectedCursor", "rejected"],
        ["range", "report"],
      ];
  for (const [key, tab] of implies) {
    if (params.has(key)) return tab;
  }
  return "jobs";
}

/** The member activity window, resolved from the URL's `?range=` preset —
 *  the same presets the report page and the Me page used. IST days, as the
 *  server computes them. */
function memberRange(preset: string): { from: string; to: string } {
  const today = istToday();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7":
      return { from: istShifted(-6), to: today };
    case "this-month":
      return { from: istFirstOfMonth(), to: today };
    case "last-month":
      return { from: istFirstOfMonth(-1), to: istEndOfLastMonth() };
    default:
      return { from: istShifted(-29), to: today };
  }
}

const KNOWN_PRESETS = new Set(["", "today", "7", "30", "this-month", "last-month"]);

/** The member's activity preset from the URL — the toggle highlights it. */
function memberPreset(request: Request): string {
  const preset = new URL(request.url).searchParams.get("range") ?? "";
  return preset !== "" && KNOWN_PRESETS.has(preset) ? preset : "30";
}

// The one jobs page for owner and member alike: the owner sees the company's
// jobs with the approval queue, activity feed and report on their own tabs; a
// member sees their own jobs (the server self-scopes `job.read_own`) with
// their report and rejected history on theirs. Only the active tab's data is
// fetched — a tab change is navigation, and the loader follows the address.
// The page's action is the queue's: decide (approve/reject) and save an edit
// — members post nothing to this page.
export { approvalQueueAction as adminJobsAction } from "./approvalLoaders";

/** The owner report's waiting count over the last 30 IST days — the light
 *  report (2026-11-28 slimming) carries just the pipeline's `pending`, and
 *  it feeds the Approval tab's badge on every owner tab. */
async function ownerPipeline(token: string, signal?: AbortSignal): Promise<Slice<OwnerPipeline>> {
  const pipeline = await settle(() =>
    fetchOwnerReport(token, { from: istShifted(-29), to: istToday() }, signal),
  );
  return pipeline.ok ? { ok: true, data: pipeline.data.pipeline } : { ok: false };
}

export async function adminJobsLoader({ request }: LoaderFunctionArgs): Promise<JobsData> {
  // Remembered for the catch: a failed load still carries the real role, so
  // the page renders the right tab strip instead of guessing the owner's.
  let known: Awaited<ReturnType<typeof requireConsoleRole>> | null = null;
  try {
    const { token, me } = await requireConsoleRole(request, ["owner", "member"]);
    known = { token, me };
    // The table's status chip rides the URL (`?status=scheduled`); "" is All.
    const KNOWN_STATUSES = new Set([
      "",
      "scheduled",
      "in_progress",
      "completed",
      "cancelled",
      "pending_approval",
      "rejected",
    ]);
    const requested = new URL(request.url).searchParams.get("status") ?? "";
    const status = KNOWN_STATUSES.has(requested) ? requested : "";
    const role = consoleRole(me) === "member" ? "member" : "owner";
    const tab = resolveJobsTab(request, role === "owner");
    switch (tab) {
      case "approval": {
        const [queue, pipeline] = await Promise.all([
          settle(() => loadApprovalQueueState(request, token)),
          ownerPipeline(token, request.signal),
        ]);
        return {
          state: "ok",
          role: "owner",
          tab,
          queue,
          pipeline,
          selfName: me.name,
        };
      }
      case "activity": {
        if (role === "owner") {
          const [activity, pipeline] = await Promise.all([
            settle(() => fetchNotifications(token, request.signal)),
            ownerPipeline(token, request.signal),
          ]);
          return { state: "ok", role, tab, activity, pipeline, selfName: me.name };
        }
        const activity = await settle(() => fetchNotifications(token, request.signal));
        return { state: "ok", role, tab, activity, selfName: me.name };
      }
      case "report": {
        if (role === "owner") {
          const [history, employees, pipeline] = await Promise.all([
            settle(() => fetchReportHistory(token, request.signal)),
            settle(async () => {
              const roster = await fetchMembers(token, request.signal);
              return roster
                .filter((m) => m.status === "active" && m.name !== null)
                .map((m): RosterPerson => ({
                  id: m.userId,
                  name: m.name ?? "",
                  phone: fmtPhone(m.countryCode, m.phoneNumber),
                  employeeCode: m.employeeCode ?? "",
                }));
            }),
            ownerPipeline(token, request.signal),
          ]);
          return {
            state: "ok",
            role,
            tab,
            history,
            employees,
            pipeline,
            selfName: me.name,
          };
        }
        const report = await settle(() =>
          fetchEmployeeReport(token, memberRange(memberPreset(request)), request.signal),
        );
        return {
          state: "ok",
          role,
          tab,
          report,
          reportPreset: memberPreset(request),
          selfName: me.name,
        };
      }
      case "rejected": {
        const rejectedCursor = new URL(request.url).searchParams.get("rejectedCursor") ?? undefined;
        const rejectedPage = await settle(() =>
          fetchMyRejectedJobs(token, rejectedCursor, request.signal),
        );
        return {
          state: "ok",
          role: "member",
          tab,
          rejected: rejectedPage.ok ? { ok: true, data: rejectedPage.data.data } : { ok: false },
          rejectedMore: rejectedPage.ok ? rejectedPage.data.hasMore : false,
          rejectedNext: rejectedPage.ok ? rejectedPage.data.nextCursor : null,
          reportPreset: memberPreset(request),
          selfName: me.name,
        };
      }
      default: {
        if (role === "owner") {
          const filters = readJobsFilters(new URL(request.url));
          const [result, skills, pipeline] = await Promise.all([
            fetchJobsPage(
              token,
              {
                page: filters.page,
                pageSize: filters.pageSize,
                ...(filters.q !== "" ? { search: filters.q } : {}),
                ...(filters.status !== "" ? { status: filters.status } : {}),
                ...(filters.skill !== "" ? { skillId: filters.skill } : {}),
                ...(filters.priority !== "" ? { priority: filters.priority } : {}),
                ...(filters.sort !== "latest" ? { sort: filters.sort } : {}),
              },
              request.signal,
            ),
            settle(() => fetchSkillOptions(token, request.signal)),
            ownerPipeline(token, request.signal),
          ]);
          return {
            state: "ok",
            role,
            tab,
            result,
            filters,
            skills,
            pipeline,
            selfName: me.name,
          };
        }
        const [rows, pendingPage] = await Promise.all([
          fetchJobs(token, request.signal, status),
          settle(() => fetchMyPendingJobs(token, request.signal)),
        ]);
        return {
          state: "ok",
          role,
          tab,
          rows,
          status,
          selfName: me.name,
          canCreateJobs: me.canCreateJobs ?? false,
          jobApprovalRequired: me.jobApprovalRequired ?? false,
          pending: pendingPage.ok ? { ok: true, data: pendingPage.data.data } : { ok: false },
          pendingMore: pendingPage.ok ? pendingPage.data.hasMore : false,
        };
      }
    }
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    // The role here is real whenever /users/me answered — a network hiccup
    // before that leaves the owner guess, which only shapes the tab strip.
    return {
      state: "failed",
      role: known !== null && consoleRole(known.me) === "member" ? "member" : "owner",
      tab: resolveJobsTab(request, known === null || consoleRole(known.me) !== "member"),
    };
  }
}

export type EmployeesData =
  | {
      state: "ok";
      result: MembersPageResult;
      filters: EmployeesFilters;
      /** The signed-in owner's user id — the row that gets the "You" pill. */
      selfUserId: string;
      /** The signed-in owner's display name for the greeting. */
      selfName: string | null;
      /** Country choices for the add-employee dialog's phone field. */
      countries: CountryCode[];
      /** The whole roster (settled, never fatal): the `(Owner)` mark on a chain
       *  and the invite's reporting-manager picker both need people outside
       *  the current page. */
      directory: Slice<MemberRow[]>;
    }
  | BrowseFail;

/** The Employees page's filters, all carried in the URL. The loader owns the
 *  reading and the defaults, so every link on the page can build a plain
 *  address and leave the rest to navigation. */
export type EmployeesFilters = {
  q: string;
  status: MembersStatusFilter;
  role: MembersRoleFilter;
  jobSetting: MembersJobSettingFilter;
  sort: MembersSort;
  page: number;
  pageSize: number;
};

const STATUS_FILTERS = new Set(["all", "active", "invited", "deactivated"]);
const ROLE_FILTERS = new Set(["all", "company_admin", "employee", "viewer"]);
const JOB_FILTERS = new Set(["all", "off", "create_only", "approval"]);
const SORTS = new Set(["joined_new", "joined_old", "name_az", "name_za", "code_az", "code_za"]);
const PAGE_SIZES = new Set([10, 25, 50]);

/** Reads the address into filters; anything unknown falls back to its
 *  default, so a hand-edited URL never breaks the page. */
export function readEmployeesFilters(url: URL): EmployeesFilters {
  const params = url.searchParams;
  const one = (key: string, allowed: Set<string>, fallback: string): string => {
    const value = params.get(key) ?? "";
    return allowed.has(value) ? value : fallback;
  };
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "10");
  return {
    q: (params.get("q") ?? "").trim().slice(0, 80),
    status: one("status", STATUS_FILTERS, "all") as MembersStatusFilter,
    role: one("role", ROLE_FILTERS, "all") as MembersRoleFilter,
    jobSetting: one("jobSetting", JOB_FILTERS, "all") as MembersJobSettingFilter,
    sort: one("sort", SORTS, "joined_new") as MembersSort,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: PAGE_SIZES.has(pageSize) ? pageSize : 10,
  };
}

/** The page size the table starts on. The rows-per-page select offers the
 *  sizes the backend accepts (1–100); these three are the sensible ones. */
export const EMPLOYEES_PAGE_SIZES = [10, 25, 50] as const;

/** The country list for a form's dial-code select — the fallback (India) when
 *  the public list cannot load, so the form still works. */
function loadCountries(request: Request): Promise<CountryCode[]> {
  return fetchCountryCodes(request.signal)
    .then((list) => (list.length > 0 ? list : FALLBACK_COUNTRY_CODES))
    .catch(() => FALLBACK_COUNTRY_CODES);
}

export async function adminEmployeesLoader({
  request,
}: LoaderFunctionArgs): Promise<EmployeesData> {
  try {
    const { token, me } = await requireConsoleRole(request, ["owner"]);
    const filters = readEmployeesFilters(new URL(request.url));
    const [result, countries, directory] = await Promise.all([
      fetchMembersPage(
        token,
        {
          page: filters.page,
          pageSize: filters.pageSize,
          ...(filters.q !== "" ? { search: filters.q } : {}),
          ...(filters.status !== "all" ? { status: filters.status } : {}),
          ...(filters.role !== "all" ? { role: filters.role } : {}),
          ...(filters.jobSetting !== "all" ? { jobSetting: filters.jobSetting } : {}),
          ...(filters.sort !== "joined_new" ? { sort: filters.sort } : {}),
        },
        request.signal,
      ),
      loadCountries(request),
      // Settled: the table's chain mark and the invite picker degrade without
      // it, but the page must never blank because the roster read failed.
      settle(() => fetchMembers(token, request.signal)),
    ]);
    return {
      state: "ok",
      result,
      filters,
      selfUserId: me.id,
      selfName: me.name,
      countries,
      directory,
    };
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

export type JobSettingsResult =
  | { kind: "job-settings"; state: "done"; userId: string }
  | { kind: "job-settings"; state: "error"; userId: string; message: string };

/** One invite from the add-employee dialog. `smsStatus` mirrors the backend:
 *  sent, failed, refused_cap or not_configured — the invite is saved either
 *  way, and the row already shows in the team list through the loader's
 *  refetch after the action. */
export type InviteResult =
  | { kind: "invite"; state: "done"; smsStatus: string | null; employeeCode: string }
  | { kind: "invite"; state: "error"; message: string };

/** One resend from an Invited row's link. The SMS outcome rides back the same
 *  way an invite's does; the row stays Invited either way. */
export type ResendResult =
  | { kind: "resend"; state: "done"; userId: string; smsStatus: string | null }
  | { kind: "resend"; state: "error"; userId: string; message: string };

export type EmployeesActionResult = JobSettingsResult | InviteResult | ResendResult;

/** The employees page's action: save one employee's two job switches, invite
 *  a new employee, or resend one invite SMS. The loader refetches after
 *  either save, so the page shows the saved values and the new row. */
export async function adminEmployeesAction({
  request,
}: ActionFunctionArgs): Promise<EmployeesActionResult> {
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "invite") {
    const name = typeof form.get("name") === "string" ? (form.get("name") as string).trim() : "";
    const countryCode =
      typeof form.get("countryCode") === "string" ? (form.get("countryCode") as string) : "";
    const phoneNumber =
      typeof form.get("phoneNumber") === "string"
        ? (form.get("phoneNumber") as string).replace(/\s+/g, "")
        : "";
    if (name === "" || !/^\+\d{1,4}$/.test(countryCode) || !/^\d{6,15}$/.test(phoneNumber)) {
      return {
        kind: "invite",
        state: "error",
        message:
          "Please enter the employee's name and a valid phone number (6 to 15 digits) before sending the invitation.",
      };
    }
    // The optional reporting manager (Epic 24, CAP-6). A value that is not an
    // id is refused visibly — never silently dropped, so the owner knows the
    // invite that went out carries no manager.
    const rawManagerId = form.get("managerId");
    const managerId = typeof rawManagerId === "string" ? rawManagerId.trim() : "";
    if (
      managerId !== "" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(managerId)
    ) {
      return {
        kind: "invite",
        state: "error",
        message: "Please choose a reporting manager from the list.",
      };
    }
    try {
      const { token } = await requireConsoleRole(request, ["owner"]);
      const result = await inviteMember(
        token,
        {
          countryCode,
          phoneNumber,
          name,
          ...(managerId !== "" ? { managerId } : {}),
        },
        request.signal,
      );
      return {
        kind: "invite",
        state: "done",
        smsStatus: result.smsStatus,
        employeeCode: result.employeeCode,
      };
    } catch (error) {
      return withActionError<EmployeesActionResult>(error, request.signal, (message) => ({
        kind: "invite",
        state: "error",
        message,
      }));
    }
  }
  const userId = typeof form.get("userId") === "string" ? (form.get("userId") as string) : "";
  if (intent === "resend") {
    try {
      const { token } = await requireConsoleRole(request, ["owner"]);
      if (userId === "") {
        return {
          kind: "resend",
          state: "error",
          userId,
          message: "We could not send the invitation again. Please try again.",
        };
      }
      const smsStatus = await resendInviteSms(token, userId, request.signal);
      return { kind: "resend", state: "done", userId, smsStatus };
    } catch (error) {
      return withActionError<EmployeesActionResult>(error, request.signal, (message) => ({
        kind: "resend",
        state: "error",
        userId,
        message,
      }));
    }
  }
  // Only the job-settings save is left, and it must say so: an unknown or
  // missing intent is refused rather than written as job settings.
  if (intent !== "job-settings") {
    return {
      kind: "job-settings",
      state: "error",
      userId,
      message: "We could not save the job settings. Please try again.",
    };
  }
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    if (userId === "") {
      return {
        kind: "job-settings",
        state: "error",
        userId,
        message: "We could not save the job settings. Please try again.",
      };
    }
    await updateJobSettings(
      token,
      userId,
      {
        canCreateJobs: form.get("canCreateJobs") === "on",
        jobApprovalRequired: form.get("jobApprovalRequired") === "on",
      },
      request.signal,
    );
    return { kind: "job-settings", state: "done", userId };
  } catch (error) {
    return withActionError<EmployeesActionResult>(error, request.signal, (message) => ({
      kind: "job-settings",
      state: "error",
      userId,
      message,
    }));
  }
}

/** The action errors every intent shares: a hard redirect on session loss, a
 *  pass-through on cancel (the request was aborted, so nothing is shown),
 *  plain English otherwise. Generic over the action's result shape, so each
 *  action builds its own kind of error result. */
export function withActionError<R>(
  error: unknown,
  signal: AbortSignal,
  build: (message: string) => R,
): R {
  if (error instanceof Response) throw error;
  if (isAuthError(error)) {
    clearSession();
    throw redirect("/login");
  }
  if (signal.aborted) throw error;
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  return build(messageForError(error));
}

export type AttendanceData =
  | { state: "failed"; tab: "month" | "report" }
  | {
      state: "ok";
      tab: "month";
      from: string;
      to: string;
      rows: MonthlyEmployeeRow[];
      /** The signed-in owner's display name for the greeting. */
      selfName: string | null;
    }
  | {
      state: "ok";
      tab: "report";
      /** The signed-in owner's display name for the greeting. */
      selfName: string | null;
      /** The attendance card's report history (this page's own type). */
      history: Slice<ReportHistoryRow[]>;
    };

/** The month table's chip/office/sort/pager state. The roster arrives whole
 *  (bounded by headcount) and the monthly endpoint is expensive, so the
 *  chips, office filter, sort and pager are the browser's work: the page
 *  reads this state from the address itself (the route's shouldRevalidate
 *  skips refetching when only these params move), while the URL keeps every
 *  view shareable. */
export interface AttendanceFilters {
  /** "" = all employees; present/late/absent = the tally chips. */
  chip: "" | "present" | "late" | "absent";
  /** "" = all offices; the ATTENDANCE_NO_OFFICE sentinel = employees with no
   *  office; else the office's name as the roster spells it. */
  office: string;
  /** "absent" = most absent first (the mockup's default); "az" = name A–Z. */
  sort: "absent" | "az";
  page: number;
  pageSize: number;
}

const ATTENDANCE_CHIPS = new Set(["", "present", "late", "absent"]);
const ATTENDANCE_SORTS = new Set(["absent", "az"]);
const ATTENDANCE_PAGE_SIZES_SET = new Set([10, 25, 50]);

/** The page sizes the attendance table starts on — the same three as jobs. */
export const ATTENDANCE_PAGE_SIZES = [10, 25, 50] as const;

export function readAttendanceFilters(params: URLSearchParams): AttendanceFilters {
  const one = (key: string, allowed: Set<string>, fallback: string): string => {
    const value = params.get(key) ?? "";
    return allowed.has(value) ? value : fallback;
  };
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "10");
  return {
    chip: one("chip", ATTENDANCE_CHIPS, "") as AttendanceFilters["chip"],
    // The office is a name the row set decides — the reader only trims and
    // caps it; an unknown office simply filters to nothing.
    office: (params.get("office") ?? "").trim().slice(0, 120),
    sort: one("sort", ATTENDANCE_SORTS, "absent") as AttendanceFilters["sort"],
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, 10000) : 1,
    pageSize: ATTENDANCE_PAGE_SIZES_SET.has(pageSize) ? pageSize : 10,
  };
}

/** The attendance page's two tabs — the running month's table, and the
 *  attendance report PDF. Only the active tab's data is fetched. */
export async function adminAttendanceLoader({
  request,
}: LoaderFunctionArgs): Promise<AttendanceData> {
  const tab = new URL(request.url).searchParams.get("tab") === "report" ? "report" : "month";
  try {
    const { token, me } = await requireConsoleRole(request, ["owner"]);
    if (tab === "report") {
      const history = await settle(() => fetchReportHistory(token, request.signal));
      return { state: "ok", tab, selfName: me.name, history };
    }
    // The window runs on IST days — the house istToday (a plain en-CA
    // locale date follows the MACHINE's timezone, so between 00:00 and
    // 05:30 IST it hands the attendance page yesterday).
    const to = istToday();
    const from = `${to.slice(0, 7)}-01`;
    const month = await fetchMonthly(token, from, to, request.signal);
    return {
      state: "ok",
      tab,
      from: month.from,
      to: month.to,
      rows: month.employees,
      selfName: me.name,
    };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed", tab };
  }
}
