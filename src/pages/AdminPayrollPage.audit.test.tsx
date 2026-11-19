import { describe, expect, it } from "bun:test";
import { screen } from "@testing-library/react";
import { payroll, renderPayrollAt, setUpPayrollPageTests } from "../testing/payrollPageKit";
import type { AuditEntryView } from "../features/admin/payrollRunApi";

setUpPayrollPageTests();

function entry(overrides: Partial<AuditEntryView> & { action: string }): AuditEntryView {
  const { action, ...rest } = overrides;
  return {
    id: `a-${action}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: "2026-11-19T06:30:00.000Z",
    actorId: "u-owner",
    action,
    targetUserId: null,
    details: {},
    ...rest,
  };
}

describe("Payroll: the audit tab", () => {
  it("humanizes the BE's prefixed actions and resolves the actor", async () => {
    payroll.runs.audit = [
      entry({
        action: "payroll.run_completed",
        details: { month: "2026-11", payslips: 5 },
      }),
      entry({
        action: "payroll.month_locked",
        details: { month: "2026-10" },
      }),
      entry({
        action: "payroll.offcycle_staged",
        targetUserId: "u-a",
        details: { month: "2026-11", label: "Festival bonus", amount: 5000, tag: "bonus" },
      }),
      entry({
        action: "payroll.run_override_set",
        targetUserId: "u-b",
        details: { month: "2026-11", field: "tds", amount: "12000.00" },
      }),
    ];
    renderPayrollAt("/admin/company/payroll?tab=audit");
    await screen.findByText("Payroll run completed");
    expect(screen.getByText(/2026-11 — 5 payslips/)).toBeTruthy();
    expect(screen.getByText("Month locked")).toBeTruthy();
    expect(screen.getByText(/2026-10/)).toBeTruthy();
    expect(screen.getByText(/Festival bonus — ₹5,000.00/)).toBeTruthy();
    expect(screen.getByText(/about Asha V/)).toBeTruthy();
    expect(screen.getByText(/TDS set to ₹12,000.00/)).toBeTruthy();
    expect(screen.getAllByText(/Ravi Kumar/).length).toBeGreaterThan(0);
    // No raw action code reaches the owner.
    expect(screen.queryByText(/payroll\./)).toBeNull();
  });

  it("reads the details keys exactly as each BE service writes them", async () => {
    payroll.runs.audit = [
      entry({
        action: "payroll.pf_config_saved",
        details: { effective_from: "2026-10-01", covered: true },
      }),
      entry({
        action: "payroll.structure_saved",
        targetUserId: "u-a",
        details: { changed_fields: ["lines"], effective_from: "2026-11-01" },
      }),
      entry({
        action: "payroll.calendar_saved",
        details: { effective_from: "2026-09-01", divisor_convention: "fixed-26" },
      }),
      entry({
        action: "payroll.component_created",
        details: { changed_fields: ["name", "isBasic"] },
      }),
      entry({
        action: "payroll.head_deactivated",
        details: { name: "Advance", effective_from: "2026-11-01" },
      }),
      entry({
        action: "payroll.offcycle_cancelled",
        details: { id: "oc-1", month: "2026-11", label: "Festival bonus", amount: 5000 },
      }),
      entry({
        action: "payroll.run_failed",
        details: { month: "2026-10", reason: "the run executor stopped before finishing" },
      }),
    ];
    renderPayrollAt("/admin/company/payroll?tab=audit");
    await screen.findByText(/from 2026-10-01 — covering employees/);
    expect(screen.getByText(/from 2026-11-01/)).toBeTruthy();
    expect(screen.getByText(/from 2026-09-01/)).toBeTruthy();
    expect(screen.getByText("Salary component added")).toBeTruthy();
    // The BE records changed fields only — no dangling "name — " line.
    expect(screen.queryByText(/Salary component added: /)).toBeNull();
    expect(screen.getByText(/Advance$/)).toBeTruthy();
    expect(screen.getByText(/Festival bonus — ₹5,000.00/)).toBeTruthy();
    expect(screen.getByText(/2026-10 — the run executor stopped before finishing/)).toBeTruthy();
  });

  it("shows the honest truncation note at the cap", async () => {
    payroll.runs.audit = Array.from({ length: 100 }, (_, i) =>
      entry({
        action: "payroll.month_locked",
        details: { month: `2026-${String((i % 12) + 1).padStart(2, "0")}` },
      }),
    );
    renderPayrollAt("/admin/company/payroll?tab=audit");
    await screen.findByText("The 100 most recent entries.");
  });

  it("renders the retry line when the read fails", async () => {
    payroll.refusals = {
      "GET /payroll/audit": {
        status: 500,
        body: { error_code: "INTERNAL_ERROR", message: "boom" },
      },
    };
    renderPayrollAt("/admin/company/payroll?tab=audit");
    await screen.findByText(/could not load/);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
