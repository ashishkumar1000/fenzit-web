import { describe, expect, it } from "bun:test";
import { fireEvent, screen } from "@testing-library/react";
import {
  lastSent,
  payroll,
  renderPayrollAt,
  setUpPayrollPageTests,
} from "../testing/payrollPageKit";

setUpPayrollPageTests();

describe("Payroll: the calendar tab", () => {
  it("names the defaults while no rows exist", async () => {
    renderPayrollAt("/admin/company/payroll?tab=calendar");
    await screen.findByText(/No salary settings have been saved yet/);
    expect(screen.getByText("Salary calculation: 26 days")).toBeTruthy();
  });

  it("saves a row sending only the filled fields — absent fields mean default", async () => {
    renderPayrollAt("/admin/company/payroll?tab=calendar");
    await screen.findByText("Save Salary Settings");
    // The labels carry an info tip inside them (its button is labelable too),
    // so match the leading text and pick the input.
    fireEvent.change(screen.getByLabelText(/^Applies From/, { selector: "input" }), {
      target: { value: "2026-12-01" },
    });
    fireEvent.change(screen.getByLabelText(/^Attendance Cut-off Day/, { selector: "input" }), {
      target: { value: "22" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Salary Settings" }));
    await screen.findByText("Salary settings saved successfully.");
    const sent = lastSent("/payroll/calendar", "PUT");
    expect(sent.body).toEqual({ effectiveFrom: "2026-12-01", cutoffDay: 22 });
    const body = sent.body as Record<string, unknown>;
    expect(body.divisorConvention).toBeUndefined();
    expect(body.payDate).toBeUndefined();
  });

  it("shows the BE's February refusal verbatim", async () => {
    payroll.refusals = {
      "PUT /payroll/calendar": {
        status: 422,
        body: {
          error_code: "VALIDATION_ERROR",
          message:
            "The cut-off day must fall between 1 and 28 — February never has a 29th to cut off.",
        },
      },
    };
    renderPayrollAt("/admin/company/payroll?tab=calendar");
    await screen.findByText("Save Salary Settings");
    fireEvent.change(screen.getByLabelText(/^Applies From/, { selector: "input" }), {
      target: { value: "2026-12-01" },
    });
    fireEvent.change(screen.getByLabelText(/^Attendance Cut-off Day/, { selector: "input" }), {
      target: { value: "29" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Salary Settings" }));
    await screen.findByText(/February never has a 29th/);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("lists the saved rows with their policy", async () => {
    payroll.calendar = [
      {
        effectiveFrom: "2026-10-01",
        divisorConvention: "fixed-30",
        cutoffDay: 25,
        payDate: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    renderPayrollAt("/admin/company/payroll?tab=calendar");
    await screen.findByText("From");
    expect(screen.getAllByText("Fixed 30 days").length).toBeGreaterThan(0);
    expect(screen.getByText("Cut-off 25")).toBeTruthy();
    expect(screen.getByText("Pay on 1")).toBeTruthy();
  });

  it("probes a month and shows what governs it and why it cannot run", async () => {
    payroll.monthStatus = {
      month: "2026-10",
      divisorConvention: "fixed-26",
      cutoffDay: 25,
      payDate: 1,
      effectiveFrom: null,
      locked: false,
      firstPayrollMonth: "2026-09",
      notRunnableReason: "Attendance runs to October 25 — ask again after the cut-off.",
    };
    renderPayrollAt("/admin/company/payroll?tab=calendar&month=2026-10");
    await screen.findByText("Salary Rule Used");
    expect(screen.getByText("Default Settings")).toBeTruthy();
    // The fact reads as a month, not the raw YYYY-MM code — the tooltip's
    // example speaks in "September 2026" terms.
    expect(screen.getByText("September 2026")).toBeTruthy();
    expect(
      screen.getByText("Attendance runs to October 25 — ask again after the cut-off."),
    ).toBeTruthy();
  });

  it("saves the state rules flag", async () => {
    renderPayrollAt("/admin/company/payroll?tab=calendar");
    await screen.findByText("State Government Rules");
    fireEvent.click(screen.getByLabelText(/My state has announced new rules/));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved successfully.");
    const sent = lastSent("/payroll/state-rules", "PUT");
    expect(sent.body).toEqual({ notified: true });
  });
});
