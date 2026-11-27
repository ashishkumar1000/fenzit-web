import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession } from "../../services/session";
import { messageForError } from "../../utils/errorMessages";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { fetchMembers, type MemberRow } from "./companyApi";
import { EMPLOYMENT_FIELDS } from "./employmentSections";
import { settle, type Slice } from "./slice";
import {
  fetchCalendar,
  fetchComponents,
  fetchEmployment,
  fetchHeads,
  fetchMonthStatus,
  fetchPfConfig,
  fetchPfExclusion,
  fetchStateRules,
  fetchStructures,
  fetchTdsConfig,
  saveEmployment,
  type EmploymentPatch,
} from "./payrollApi";
import type {
  DeductionHeadView,
  EmploymentView,
  PayrollCalendarView,
  PayrollMonthStatusView,
  PayrollPfConfigView,
  PayrollPfExclusionView,
  PayrollStateRulesView,
  SalaryComponentView,
  SalaryStructureView,
  TdsConfigView,
} from "./payrollViews";
import { loadRunsTab, loadAuditTab, type PayrollRunTabData } from "./payrollRunLoaders";

/**
 * Loaders for the payroll page and the employment resource route. The page
 * keeps the jobs-page idiom: the URL's `?tab=` picks the section and only
 * that section's data is fetched; every section settles on its own so one
 * failed fetch is a quiet line, never a blank page. The employment resource
 * route exists for the Employees page's dialog — a loader to open with and
 * an action to save through, no page of its own.
 */

export type PayrollTab =
  "components" | "structures" | "deductions" | "statutory" | "calendar" | "runs" | "audit";

const TABS = new Set<PayrollTab>([
  "components",
  "structures",
  "deductions",
  "statutory",
  "calendar",
  "runs",
  "audit",
]);

/** The address's tab — the first tab when the address is bare. */
export function readPayrollTab(url: URL): PayrollTab {
  const requested = url.searchParams.get("tab") ?? "";
  return TABS.has(requested as PayrollTab) ? (requested as PayrollTab) : "components";
}

const MONTH_SHAPE = /^\d{4}-(?:0[1-9]|1[0-2])$/;

export type PayrollData =
  | { state: "failed"; tab: PayrollTab }
  | PayrollRunTabData
  | {
      state: "ok";
      tab: "components";
      components: Slice<SalaryComponentView[]>;
    }
  | {
      state: "ok";
      tab: "structures";
      /** The team (active + invited) for the picker. */
      members: Slice<MemberRow[]>;
      /** The `?employee=` choice as a real member row, or null. */
      employee: MemberRow | null;
      /** The chosen employee's revisions; ok-false reads as "no structure yet". */
      structures: Slice<SalaryStructureView[]>;
      components: Slice<SalaryComponentView[]>;
    }
  | {
      state: "ok";
      tab: "deductions";
      heads: Slice<DeductionHeadView[]>;
    }
  | {
      state: "ok";
      tab: "statutory";
      members: Slice<MemberRow[]>;
      pfRows: Slice<PayrollPfConfigView[]>;
      tds: Slice<TdsConfigView>;
      /** The `?pfEmployee=` pick (a real member row, or null). */
      pfEmployee: MemberRow | null;
      /** That employee's exclusion state; null when nobody is picked. */
      pfExclusion: Slice<PayrollPfExclusionView | null>;
    }
  | {
      state: "ok";
      tab: "calendar";
      calendar: Slice<PayrollCalendarView[]>;
      /** The `?month=` probe (null when the address carries none). */
      month: string | null;
      monthStatus: Slice<PayrollMonthStatusView | null>;
      stateRules: Slice<PayrollStateRulesView>;
    };

export async function adminPayrollLoader({ request }: LoaderFunctionArgs): Promise<PayrollData> {
  const url = new URL(request.url);
  const tab = readPayrollTab(url);
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    // The run tabs' data lives in its own module — same loader, one dispatch.
    if (tab === "runs") return await loadRunsTab(request, token, tab);
    if (tab === "audit") return await loadAuditTab(request, token, tab);
    switch (tab) {
      case "components": {
        return {
          state: "ok",
          tab,
          components: await settle(() => fetchComponents(token, request.signal)),
        };
      }
      case "structures": {
        const employeeId = url.searchParams.get("employee") ?? "";
        const [members, components] = await Promise.all([
          settle(() => fetchMembers(token, request.signal)),
          settle(() => fetchComponents(token, request.signal)),
        ]);
        const employee =
          employeeId !== "" && members.ok
            ? (members.data.find((m) => m.userId === employeeId) ?? null)
            : null;
        // A hand-typed or stale employee id answers 404 from the BE — that
        // reads as "nobody chosen" (the picker re-renders), not as a failed
        // page; a genuinely dead fetch still shows the retry line.
        const structures = await structuresFor(token, employee, request.signal);
        return { state: "ok", tab, members, employee, structures, components };
      }
      case "deductions": {
        return {
          state: "ok",
          tab,
          heads: await settle(() => fetchHeads(token, request.signal)),
        };
      }
      case "statutory": {
        const pfEmployeeId = url.searchParams.get("pfEmployee") ?? "";
        const [members, pfRows, tds] = await Promise.all([
          settle(() => fetchMembers(token, request.signal)),
          settle(() => fetchPfConfig(token, request.signal)),
          settle(() => fetchTdsConfig(token, request.signal)),
        ]);
        const pfEmployee =
          pfEmployeeId !== "" && members.ok
            ? (members.data.find((m) => m.userId === pfEmployeeId) ?? null)
            : null;
        // Same 404-as-unpicked rule the structures tab uses: a stale id
        // reads as nobody chosen, not as a failed page.
        const pfExclusion = await pfExclusionFor(token, pfEmployee, request.signal);
        return { state: "ok", tab, members, pfRows, tds, pfEmployee, pfExclusion };
      }
      default: {
        const month = url.searchParams.get("month");
        const probedMonth = month !== null && MONTH_SHAPE.test(month) ? month : null;
        const [calendar, monthStatus, stateRules] = await Promise.all([
          settle(() => fetchCalendar(token, request.signal)),
          settle(async () =>
            probedMonth === null ? null : fetchMonthStatus(token, probedMonth, request.signal),
          ),
          settle(() => fetchStateRules(token, request.signal)),
        ]);
        return { state: "ok", tab, calendar, month: probedMonth, monthStatus, stateRules };
      }
    }
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

async function structuresFor(
  token: string,
  employee: MemberRow | null,
  signal: AbortSignal,
): Promise<Slice<SalaryStructureView[]>> {
  if (employee === null) return { ok: true, data: [] };
  try {
    return { ok: true, data: await fetchStructures(token, employee.userId, signal) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { ok: true, data: [] };
    return { ok: false };
  }
}

async function pfExclusionFor(
  token: string,
  employee: MemberRow | null,
  signal: AbortSignal,
): Promise<Slice<PayrollPfExclusionView | null>> {
  if (employee === null) return { ok: true, data: null };
  try {
    return { ok: true, data: await fetchPfExclusion(token, employee.userId, signal) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { ok: true, data: null };
    return { ok: false };
  }
}

/** ── The employment resource route (the Employees page's dialog) ──────── */

export type EmploymentResource =
  { state: "ok"; employment: EmploymentView } | { state: "not-found" } | { state: "failed" };

/** The dialog's open read. The route carries PAN/DOB/bank for one member,
 *  so the role gate sits before the fetch and the answer never leaks past
 *  the owner. */
export async function payrollEmploymentLoader({
  request,
}: LoaderFunctionArgs): Promise<EmploymentResource> {
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    // The id comes from a table row; a stale one answers 404 from the BE,
    // which the catch below maps to the dialog's "not on the team" state.
    const userId = new URL(request.url).searchParams.get("userId") ?? "";
    if (userId === "") return { state: "not-found" };
    const employment = await fetchEmployment(token, userId, request.signal);
    return { state: "ok", employment };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    if (error instanceof ApiError && error.status === 404) return { state: "not-found" };
    return { state: "failed" };
  }
}

/** The dialog's save. The form carries one field per changed key (the
 *  dialog diffs against the loaded row); the action forwards exactly those
 *  keys — untouched fields never reach the wire, so nothing can be cleared
 *  by accident. An emptied touched field rides the form as `""` and leaves
 *  the action as JSON `null`: the BE's clear verb for every employment
 *  field (shaped fields refuse `""` outright — a date, PAN or IFSC cannot
 *  "be" an empty string — and plain-text fields clear identically through
 *  the BE's own normalisation). */
export type EmploymentSaveResult =
  | { state: "done"; employment: EmploymentView }
  | { state: "error"; message: string }
  | { state: "not-found" };

export async function payrollEmploymentAction({
  request,
}: ActionFunctionArgs): Promise<EmploymentSaveResult> {
  const form = await request.formData();
  const userId = typeof form.get("userId") === "string" ? (form.get("userId") as string) : "";
  if (userId === "") return { state: "not-found" };
  const body: EmploymentPatch = {};
  for (const field of EMPLOYMENT_FIELDS) {
    const value = form.get(field);
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (field === "employeeCode") {
        // The code never clears — the dialog blocks it; forwarding "" would
        // only earn the BE's refusal, so keep it a string.
        body[field] = trimmed;
        continue;
      }
      // "" = clear (the BE's null verb — shaped fields refuse an empty
      // string outright); a value sets.
      body[field] = trimmed === "" ? null : trimmed;
    }
  }
  if (Object.keys(body).length === 0) {
    return { state: "error", message: "Nothing changed yet — edit a field to save." };
  }
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    const employment = await saveEmployment(token, userId, body, request.signal);
    return { state: "done", employment };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    if (error instanceof ApiError && error.status === 404) return { state: "not-found" };
    // The employment refusals are plain-English BE copy (the code clash,
    // the exit-before-join rule) — same verbatim-4xx contract as the page.
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 403
    ) {
      const errBody = error.body as { message?: unknown } | undefined;
      if (errBody !== undefined && typeof errBody.message === "string" && errBody.message !== "") {
        return { state: "error", message: errBody.message };
      }
    }
    return { state: "error", message: messageForError(error) };
  }
}
