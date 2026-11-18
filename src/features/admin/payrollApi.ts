import { apiFetch } from "../../services/api";
import type {
  DeductionHeadView,
  EmploymentView,
  FormulaNode,
  PayrollCalendarView,
  PayrollMonthStatusView,
  PayrollPfConfigView,
  PayrollPfExclusionView,
  PayrollStateRulesView,
  SalaryComponentView,
  SalaryStructureView,
  TdsConfigView,
} from "./payrollViews";

/**
 * Clients for the payroll configuration surfaces (epic 23, stories 1/3/4/5 —
 * all shipped, all granted to `payroll.config` / `member.employment`, i.e.
 * the company admin alone). Every wrapper is a thin typed fetch: the views
 * live in payrollViews.ts, the wire contracts live on the BE.
 */

/** ── Salary components (23-3) ─────────────────────────────────────────── */

export function fetchComponents(
  token: string,
  signal?: AbortSignal,
): Promise<SalaryComponentView[]> {
  return apiFetch<SalaryComponentView[]>("/api/v1/payroll/components", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export function createComponent(
  token: string,
  body: { name: string; isBasic?: boolean },
  signal?: AbortSignal,
): Promise<SalaryComponentView> {
  return apiFetch<SalaryComponentView>("/api/v1/payroll/components", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

/** The edit is tri-state on the wire — a key the caller leaves out is left
 *  alone; `null` is refused by the BE (there is no clear verb), so the
 *  dialogs build the body from only the fields that changed. */
export function updateComponent(
  token: string,
  componentId: string,
  body: { name?: string; isBasic?: boolean; active?: boolean },
  signal?: AbortSignal,
): Promise<SalaryComponentView> {
  return apiFetch<SalaryComponentView>(
    `/api/v1/payroll/components/${encodeURIComponent(componentId)}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    },
  );
}

/** ── Salary structures (23-3) ─────────────────────────────────────────── */

export function fetchStructures(
  token: string,
  userId: string,
  signal?: AbortSignal,
): Promise<SalaryStructureView[]> {
  return apiFetch<SalaryStructureView[]>(
    `/api/v1/members/${encodeURIComponent(userId)}/salary-structures`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
}

/** One line of a structure save: an amount XOR a formula AST, keyed by the
 *  component's id. Money arrives as 2dp text; the AST numbers are JSON
 *  numbers (formula.ts validates them as finite). */
export interface StructureLineInput {
  componentId: string;
  amount?: string;
  formula?: FormulaNode;
}

export function saveStructure(
  token: string,
  userId: string,
  body: { effectiveFrom: string; lines: StructureLineInput[] },
  signal?: AbortSignal,
): Promise<SalaryStructureView> {
  return apiFetch<SalaryStructureView>(
    `/api/v1/members/${encodeURIComponent(userId)}/salary-structures`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    },
  );
}

/** ── Deduction heads (23-5) ───────────────────────────────────────────── */

export function fetchHeads(token: string, signal?: AbortSignal): Promise<DeductionHeadView[]> {
  return apiFetch<DeductionHeadView[]>("/api/v1/payroll/deduction-heads", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** Create-or-replace for the same name + effective date (the BE's POST
 *  semantics — there is no separate update verb). */
export function saveHead(
  token: string,
  body: {
    name: string;
    kind: "flat" | "percent";
    amount: string;
    basis?: "basic" | "gross";
    effectiveFrom: string;
  },
  signal?: AbortSignal,
): Promise<DeductionHeadView> {
  return apiFetch<DeductionHeadView>("/api/v1/payroll/deduction-heads", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

/** Deactivate one head. `confirm: true` is the only accepted value — the
 *  BE refuses the request without it; deactivation has no undo. */
export function deactivateHead(
  token: string,
  headId: string,
  signal?: AbortSignal,
): Promise<DeductionHeadView> {
  return apiFetch<DeductionHeadView>(
    `/api/v1/payroll/deduction-heads/${encodeURIComponent(headId)}/deactivate`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
      signal,
    },
  );
}

/** ── Statutory config (23-5) ──────────────────────────────────────────── */

export function fetchPfConfig(token: string, signal?: AbortSignal): Promise<PayrollPfConfigView[]> {
  return apiFetch<PayrollPfConfigView[]>("/api/v1/payroll/pf-config", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export function savePfConfig(
  token: string,
  body: { effectiveFrom: string; covered: boolean },
  signal?: AbortSignal,
): Promise<PayrollPfConfigView> {
  return apiFetch<PayrollPfConfigView>("/api/v1/payroll/pf-config", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export function fetchPfExclusion(
  token: string,
  userId: string,
  signal?: AbortSignal,
): Promise<PayrollPfExclusionView> {
  return apiFetch<PayrollPfExclusionView>(
    `/api/v1/payroll/employees/${encodeURIComponent(userId)}/pf-exclusion`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
}

export function savePfExclusion(
  token: string,
  userId: string,
  excluded: boolean,
  signal?: AbortSignal,
): Promise<PayrollPfExclusionView> {
  return apiFetch<PayrollPfExclusionView>(
    `/api/v1/payroll/employees/${encodeURIComponent(userId)}/pf-exclusion`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ excluded }),
      signal,
    },
  );
}

export function fetchTdsConfig(token: string, signal?: AbortSignal): Promise<TdsConfigView> {
  return apiFetch<TdsConfigView>("/api/v1/payroll/tds-config", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** ── Calendar, month status, state rules (23-4) ───────────────────────── */

export function fetchCalendar(token: string, signal?: AbortSignal): Promise<PayrollCalendarView[]> {
  return apiFetch<PayrollCalendarView[]>("/api/v1/payroll/calendar", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** Absent fields keep the default (the BE's full-envelope idiom: a
 *  same-date save replaces the whole row, missing fields fall back to the
 *  defaults — NOT to the replaced revision's values). */
export function saveCalendar(
  token: string,
  body: {
    effectiveFrom: string;
    divisorConvention?: PayrollCalendarView["divisorConvention"];
    cutoffDay?: number;
    payDate?: number;
  },
  signal?: AbortSignal,
): Promise<PayrollCalendarView> {
  return apiFetch<PayrollCalendarView>("/api/v1/payroll/calendar", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export function fetchMonthStatus(
  token: string,
  month: string,
  signal?: AbortSignal,
): Promise<PayrollMonthStatusView> {
  return apiFetch<PayrollMonthStatusView>(`/api/v1/payroll/months/${encodeURIComponent(month)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export function fetchStateRules(
  token: string,
  signal?: AbortSignal,
): Promise<PayrollStateRulesView> {
  return apiFetch<PayrollStateRulesView>("/api/v1/payroll/state-rules", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export function saveStateRules(
  token: string,
  notified: boolean,
  signal?: AbortSignal,
): Promise<PayrollStateRulesView> {
  return apiFetch<PayrollStateRulesView>("/api/v1/payroll/state-rules", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ notified }),
    signal,
  });
}

/** ── Employment data (23-1) ───────────────────────────────────────────── */

export function fetchEmployment(
  token: string,
  userId: string,
  signal?: AbortSignal,
): Promise<EmploymentView> {
  return apiFetch<EmploymentView>(`/api/v1/members/${encodeURIComponent(userId)}/employment`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** The employment save is tri-state on the wire (absent = leave alone,
 *  `null` = clear — the BE's clear verb for every field; shaped fields like
 *  dates, PAN and IFSC refuse an empty string outright). The dialog builds
 *  the body by diffing against the loaded row and the resource action turns
 *  an emptied touched field into `null`, so a field the owner never touched
 *  is never sent, and `employeeCode` — which refuses to clear — is guarded
 *  before send. */
export type EmploymentPatch = Partial<
  Omit<EmploymentView, "userId" | "employeeCode"> & { employeeCode?: string }
>;

export function saveEmployment(
  token: string,
  userId: string,
  body: EmploymentPatch,
  signal?: AbortSignal,
): Promise<EmploymentView> {
  return apiFetch<EmploymentView>(`/api/v1/members/${encodeURIComponent(userId)}/employment`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}
