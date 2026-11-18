import { describe, expect, it } from "bun:test";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { sentRequests } from "../testing/fetchMock";
import {
  BASIC_ID,
  HRA_ID,
  OLD_ID,
  lastSent,
  payroll,
  renderPayrollAt,
  setUpPayrollPageTests,
  structureRow,
} from "../testing/payrollPageKit";

setUpPayrollPageTests();

const LINE_SELECT = "Add a component";

describe("Payroll: the structures tab", () => {
  it("renders the picker-only state on the bare tab", async () => {
    renderPayrollAt("/admin/company/payroll?tab=structures");
    await screen.findByText(/Pick an employee to see their salary structure/);
    expect(sentCount("/salary-structures")).toBe(0);
  });

  it("lists an employee's revisions with names and computed money", async () => {
    payroll.structures["u-a"] = [
      structureRow("2026-09-01", [
        {
          componentId: BASIC_ID,
          componentName: "Basic salary",
          amount: "20000.00",
          computedAmount: "20000.00",
        },
        {
          componentId: HRA_ID,
          componentName: "House rent allowance",
          formula: {
            kind: "percent-of",
            percent: 40,
            of: { kind: "component", componentId: BASIC_ID },
          },
          computedAmount: "8000.00",
        },
      ]),
    ];
    renderPayrollAt("/admin/company/payroll?tab=structures&employee=u-a");
    await screen.findByText(/Applies from/);
    expect(screen.getAllByText("₹20,000.00").length).toBe(2);
    expect(screen.getByText("40% of Basic salary")).toBeTruthy();
    expect(screen.getAllByText("₹8,000.00").length).toBe(1);
  });

  it("saves an amount line as the exact wire body", async () => {
    renderPayrollAt("/admin/company/payroll?tab=structures&employee=u-a");
    await screen.findByText("New revision");
    fireEvent.click(screen.getByRole("button", { name: "New revision" }));
    fireEvent.change(screen.getByLabelText("Applies from"), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText(LINE_SELECT), { target: { value: BASIC_ID } });
    fireEvent.change(screen.getByPlaceholderText("20000.00"), { target: { value: "20000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save revision" }));
    await screen.findByText("Structure saved");
    const sent = lastSent("/members/u-a/salary-structures", "PUT");
    expect(sent.body).toEqual({
      effectiveFrom: "2026-12-01",
      lines: [{ componentId: BASIC_ID, amount: "20000.00" }],
    });
  });

  it("builds the two formula shapes the BE evaluates", async () => {
    renderPayrollAt("/admin/company/payroll?tab=structures&employee=u-a");
    await screen.findByText("New revision");
    fireEvent.click(screen.getByRole("button", { name: "New revision" }));
    fireEvent.change(screen.getByLabelText(LINE_SELECT), { target: { value: BASIC_ID } });
    fireEvent.change(screen.getByPlaceholderText("20000.00"), { target: { value: "20000.00" } });
    fireEvent.change(screen.getByLabelText(LINE_SELECT), { target: { value: HRA_ID } });
    const dialogLine = screen.getByText("House rent allowance").closest("div")!;
    fireEvent.click(within(dialogLine).getByLabelText("Formula"));
    fireEvent.change(within(dialogLine).getByLabelText("Percent"), { target: { value: "40" } });
    fireEvent.change(within(dialogLine).getByLabelText("Percent of component"), {
      target: { value: BASIC_ID },
    });
    fireEvent.change(within(dialogLine).getByLabelText("Adjustment"), { target: { value: "+" } });
    fireEvent.change(within(dialogLine).getByLabelText("Flat amount"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save revision" }));
    await screen.findByText("Structure saved");
    const sent = lastSent("/members/u-a/salary-structures", "PUT");
    expect(sent.body).toEqual({
      effectiveFrom: expect.any(String),
      lines: [
        { componentId: BASIC_ID, amount: "20000.00" },
        {
          componentId: HRA_ID,
          formula: {
            kind: "binary",
            op: "+",
            left: {
              kind: "percent-of",
              percent: 40,
              of: { kind: "component", componentId: BASIC_ID },
            },
            right: { kind: "const", value: 1000 },
          },
        },
      ],
    });
  });

  it("shows the BE's cycle refusal verbatim", async () => {
    payroll.refusals = {
      "PUT /salary-structures": {
        status: 422,
        body: {
          error_code: "VALIDATION_ERROR",
          message:
            "This formula circles back on itself: Basic salary → House rent allowance → Basic salary.",
        },
      },
    };
    renderPayrollAt("/admin/company/payroll?tab=structures&employee=u-a");
    await screen.findByText("New revision");
    fireEvent.click(screen.getByRole("button", { name: "New revision" }));
    fireEvent.change(screen.getByLabelText(LINE_SELECT), { target: { value: BASIC_ID } });
    fireEvent.change(screen.getByPlaceholderText("20000.00"), { target: { value: "20000.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save revision" }));
    await screen.findByText(/circles back on itself/);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("pins a line whose component is inactive — the save carries it and the BE refuses with its own copy", async () => {
    payroll.structures["u-a"] = [
      structureRow("2026-09-01", [
        {
          componentId: OLD_ID,
          componentName: "Old allowance",
          amount: "500.00",
          computedAmount: "500.00",
        },
      ]),
    ];
    renderPayrollAt("/admin/company/payroll?tab=structures&employee=u-a");
    await screen.findByRole("button", { name: "Edit" });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByText(/This component is inactive/);
    fireEvent.click(screen.getByRole("button", { name: "Save revision" }));
    await waitFor(() => {
      const sent = lastSent("/members/u-a/salary-structures", "PUT");
      expect(sent.body).toEqual({
        effectiveFrom: "2026-09-01",
        lines: [{ componentId: OLD_ID, amount: "500.00" }],
      });
    });
  });

  it("shows the advisory hint when Basic is missing, and still saves", async () => {
    renderPayrollAt("/admin/company/payroll?tab=structures&employee=u-a");
    await screen.findByText("New revision");
    fireEvent.click(screen.getByRole("button", { name: "New revision" }));
    fireEvent.change(screen.getByLabelText(LINE_SELECT), { target: { value: HRA_ID } });
    fireEvent.change(screen.getByPlaceholderText("20000.00"), { target: { value: "8000.00" } });
    expect(screen.getByText(/must include the Basic salary component/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save revision" }));
    await waitFor(() => {
      expect(sentCount("/salary-structures", "PUT")).toBe(1);
    });
  });
});

function sentCount(pathSuffix: string, method?: string): number {
  return sentRequests().filter(
    (r) => r.url.includes(pathSuffix) && (method !== undefined ? r.method === method : true),
  ).length;
}
