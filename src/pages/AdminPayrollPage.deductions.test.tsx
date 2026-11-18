import { describe, expect, it } from "bun:test";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import {
  lastSent,
  payroll,
  renderPayrollAt,
  setUpPayrollPageTests,
} from "../testing/payrollPageKit";

setUpPayrollPageTests();

describe("Payroll: deduction heads", () => {
  it("renders flat and percent rows with their basis", async () => {
    payroll.heads = [
      {
        id: "h-pt",
        name: "Professional tax",
        kind: "flat",
        amount: "200.00",
        basis: null,
        effectiveFrom: "2026-04-01",
        active: true,
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "h-ins",
        name: "Group insurance",
        kind: "percent",
        amount: "2.00",
        basis: "gross",
        effectiveFrom: "2026-04-01",
        active: true,
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    renderPayrollAt("/admin/company/payroll?tab=deductions");
    await screen.findByText("Professional tax");
    expect(screen.getByText("Percent of gross")).toBeTruthy();
    expect(screen.getByText("2%")).toBeTruthy();
    expect(screen.getByText("₹200.00")).toBeTruthy();
  });

  it("saves a flat head without a basis", async () => {
    renderPayrollAt("/admin/company/payroll?tab=deductions");
    await screen.findByRole("button", { name: "Add deduction" });
    fireEvent.click(screen.getByRole("button", { name: "Add deduction" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Professional tax" } });
    fireEvent.change(screen.getByLabelText("Amount per month"), { target: { value: "200" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await screen.findByText(/applies from/);
    const sent = lastSent("/payroll/deduction-heads", "POST");
    expect(sent.body).toEqual({
      name: "Professional tax",
      kind: "flat",
      amount: "200.00",
      effectiveFrom: expect.any(String),
    });
    expect((sent.body as Record<string, unknown>).basis).toBeUndefined();
  });

  it("saves a percent head with its basis", async () => {
    renderPayrollAt("/admin/company/payroll?tab=deductions");
    await screen.findByRole("button", { name: "Add deduction" });
    fireEvent.click(screen.getByRole("button", { name: "Add deduction" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Group insurance" } });
    fireEvent.change(screen.getByLabelText("Kind"), { target: { value: "percent" } });
    fireEvent.change(screen.getByLabelText("Percent"), { target: { value: "2" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await screen.findByText(/applies from/);
    const sent = lastSent("/payroll/deduction-heads", "POST");
    expect(sent.body).toEqual({
      name: "Group insurance",
      kind: "percent",
      amount: "2.00",
      basis: "gross",
      effectiveFrom: expect.any(String),
    });
  });

  it("shows the BE's refusal verbatim on a bad percent", async () => {
    payroll.refusals = {
      "POST /payroll/deduction-heads": {
        status: 422,
        body: {
          error_code: "VALIDATION_ERROR",
          message: "A percentage is between 0 and 100 — 150 is outside the range.",
        },
      },
    };
    renderPayrollAt("/admin/company/payroll?tab=deductions");
    await screen.findByRole("button", { name: "Add deduction" });
    fireEvent.click(screen.getByRole("button", { name: "Add deduction" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Big cut" } });
    fireEvent.change(screen.getByLabelText("Amount per month"), { target: { value: "150" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await screen.findByText(/outside the range/);
  });

  it("deactivates only with the confirm checkbox", async () => {
    payroll.heads = [
      {
        id: "h-pt",
        name: "Professional tax",
        kind: "flat",
        amount: "200.00",
        basis: null,
        effectiveFrom: "2026-04-01",
        active: true,
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    renderPayrollAt("/admin/company/payroll?tab=deductions");
    await screen.findByRole("button", { name: "Deactivate" });
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    const dialog = screen.getByRole("dialog");
    const deactivate = within(dialog).getByRole("button", {
      name: "Deactivate",
    }) as HTMLButtonElement;
    expect(deactivate.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/I understand/));
    expect(deactivate.disabled).toBe(false);
    fireEvent.click(deactivate);
    await waitFor(() => {
      const sent = lastSent("/deduction-heads/h-pt/deactivate", "PUT");
      expect(sent.body).toEqual({ confirm: true });
    });
  });
});
