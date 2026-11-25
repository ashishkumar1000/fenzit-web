import { describe, expect, it } from "bun:test";
import { fireEvent, screen } from "@testing-library/react";
import {
  lastSent,
  payroll,
  renderPayrollAt,
  setUpPayrollPageTests,
} from "../testing/payrollPageKit";

setUpPayrollPageTests();

describe("Payroll: the statutory tab", () => {
  it("renders the PF rows and the TDS constants", async () => {
    payroll.pfRows = [
      { effectiveFrom: "2026-09-01", covered: true, updatedAt: "2026-01-01T00:00:00Z" },
    ];
    renderPayrollAt("/admin/company/payroll?tab=statutory");
    await screen.findByText("Provident Fund (PF)");
    expect(screen.getByText("PF Enabled")).toBeTruthy();
    expect(screen.getByText("₹75,000.00")).toBeTruthy();
    expect(screen.getByText(/FY 2026-27/)).toBeTruthy();
    expect(screen.getByText("5%")).toBeTruthy();
  });

  it("saves the PF switch with the chosen date and coverage", async () => {
    renderPayrollAt("/admin/company/payroll?tab=statutory");
    await screen.findByText("Provident Fund (PF)");
    fireEvent.change(screen.getByLabelText("PF Should Apply From"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText("PF Setting"), { target: { value: "false" } });
    fireEvent.click(screen.getByRole("button", { name: "Save PF Settings" }));
    await screen.findByText("PF settings saved successfully.");
    const sent = lastSent("/payroll/pf-config", "PUT");
    expect(sent.body).toEqual({ effectiveFrom: "2026-10-01", covered: false });
  });

  it("loads and saves one employee's exclusion", async () => {
    renderPayrollAt("/admin/company/payroll?tab=statutory&pfEmployee=u-b");
    await screen.findByText(/covered by PF/);
    expect(screen.getByText("Not updated yet.")).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Do Not Apply PF to This Employee/));
    fireEvent.click(screen.getByRole("button", { name: "Save PF Setting" }));
    await screen.findByText("Saved successfully.");
    const sent = lastSent("/payroll/employees/u-b/pf-exclusion", "PUT");
    expect(sent.body).toEqual({ excluded: true });
  });

  it("shows the ever-member refusal verbatim", async () => {
    payroll.refusals = {
      "PUT /pf-exclusion": {
        status: 422,
        body: {
          error_code: "VALIDATION_ERROR",
          message:
            "Asha V carries a UAN, so PF always applies to them — an exclusion would be refused by the EPFO.",
        },
      },
    };
    renderPayrollAt("/admin/company/payroll?tab=statutory&pfEmployee=u-a");
    await screen.findByText(/covered by PF/);
    fireEvent.click(screen.getByLabelText(/Do Not Apply PF to This Employee/));
    fireEvent.click(screen.getByRole("button", { name: "Save PF Setting" }));
    await screen.findByText(/carries a UAN/);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("reads the TDS card even when nothing else is configured", async () => {
    renderPayrollAt("/admin/company/payroll?tab=statutory");
    await screen.findByText("Income Tax Deduction (TDS) – FY 2026-27");
    expect(screen.getByText("Above the highest income limit")).toBeTruthy();
    expect(screen.getByText(/Section 157/)).toBeTruthy();
  });
});
