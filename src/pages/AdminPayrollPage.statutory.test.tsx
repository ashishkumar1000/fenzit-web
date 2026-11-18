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
    await screen.findByText("Provident Fund");
    expect(screen.getByText("Covered")).toBeTruthy();
    expect(screen.getByText("₹75,000.00")).toBeTruthy();
    expect(screen.getByText(/FY 2026-27/)).toBeTruthy();
    expect(screen.getByText("5%")).toBeTruthy();
  });

  it("saves the PF switch with the chosen date and coverage", async () => {
    renderPayrollAt("/admin/company/payroll?tab=statutory");
    await screen.findByText("Provident Fund");
    fireEvent.change(screen.getByLabelText("Covered from"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Coverage"), { target: { value: "false" } });
    fireEvent.click(screen.getByRole("button", { name: "Save PF switch" }));
    await screen.findByText("PF switch saved.");
    const sent = lastSent("/payroll/pf-config", "PUT");
    expect(sent.body).toEqual({ effectiveFrom: "2026-10-01", covered: false });
  });

  it("loads and saves one employee's exclusion", async () => {
    renderPayrollAt("/admin/company/payroll?tab=statutory&pfEmployee=u-b");
    await screen.findByText(/covered by PF/);
    expect(screen.getByText(/never set/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Exclude from PF/));
    fireEvent.click(screen.getByRole("button", { name: "Save exclusion" }));
    await screen.findByText("Saved.");
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
    fireEvent.click(screen.getByLabelText(/Exclude from PF/));
    fireEvent.click(screen.getByRole("button", { name: "Save exclusion" }));
    await screen.findByText(/carries a UAN/);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("reads the TDS card even when nothing else is configured", async () => {
    renderPayrollAt("/admin/company/payroll?tab=statutory");
    await screen.findByText("Tax deducted at source — FY 2026-27");
    expect(screen.getByText("Above the last slab")).toBeTruthy();
    expect(screen.getByText(/section 157/)).toBeTruthy();
  });
});
