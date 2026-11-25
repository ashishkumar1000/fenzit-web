import { describe, expect, it } from "bun:test";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { sentRequests } from "../testing/fetchMock";
import {
  lastSent,
  payroll,
  renderPayrollAt,
  setUpPayrollPageTests,
} from "../testing/payrollPageKit";

setUpPayrollPageTests();

describe("Payroll: the component library", () => {
  it("lists the library with the Basic mark and the inactive state", async () => {
    renderPayrollAt("/admin/company/payroll");
    await screen.findByText("Basic salary");
    expect(screen.getByText("House rent allowance")).toBeTruthy();
    expect(screen.getAllByText("Inactive").length).toBe(1);
  });

  it("saves a new component with only the fields the form filled", async () => {
    renderPayrollAt("/admin/company/payroll");
    await screen.findByText("Basic salary");
    fireEvent.click(screen.getByRole("button", { name: "Add Salary Component" }));
    const dialog = screen.getByRole("dialog", { name: "Add Salary Component" });
    fireEvent.change(within(dialog).getByLabelText("Component Name"), {
      target: { value: "Travel allowance" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await screen.findByText(/has been added successfully/);
    const sent = lastSent("/payroll/components", "POST");
    expect(sent.body).toEqual({ name: "Travel allowance" });
  });

  it("sends isBasic when the box is ticked", async () => {
    renderPayrollAt("/admin/company/payroll");
    await screen.findByText("Basic salary");
    fireEvent.click(screen.getByRole("button", { name: "Add Salary Component" }));
    const dialog = screen.getByRole("dialog", { name: "Add Salary Component" });
    fireEvent.change(within(dialog).getByLabelText("Component Name"), {
      target: { value: "Basic two" },
    });
    fireEvent.click(within(dialog).getByLabelText(/This is Basic Salary/));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      const sent = lastSent("/payroll/components", "POST");
      expect(sent.body).toEqual({ name: "Basic two", isBasic: true });
    });
  });

  it("shows the BE's duplicate refusal verbatim", async () => {
    payroll.refusals = {
      "POST /payroll/components": {
        status: 409,
        body: {
          error_code: "DUPLICATE_RESOURCE",
          message: 'A salary component called "Basic salary" already exists.',
        },
      },
    };
    renderPayrollAt("/admin/company/payroll");
    await screen.findByText("Basic salary");
    fireEvent.click(screen.getByRole("button", { name: "Add Salary Component" }));
    const dialog = screen.getByRole("dialog", { name: "Add Salary Component" });
    fireEvent.change(within(dialog).getByLabelText("Component Name"), {
      target: { value: "Basic salary" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await screen.findByText('A salary component called "Basic salary" already exists.');
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});

/** Every component row mounts its edit dialog, and the add dialog exists
 *  too — happy-dom does not compute aria-labelledby names, so pick the
 *  open dialog by its heading text instead. */
function editDialogFor(componentName: string): HTMLElement {
  const dialogs = screen.getAllByRole("dialog");
  const match = dialogs.find((d) => d.textContent?.includes(`Edit "${componentName}"`));
  if (match === undefined) throw new Error(`no edit dialog for ${componentName}`);
  return match;
}
describe("Payroll: editing a component sends a computed-diff PATCH", () => {
  it("sends only the renamed field", async () => {
    renderPayrollAt("/admin/company/payroll");
    await screen.findByText("House rent allowance");
    const row = screen.getByText("House rent allowance").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    const dialog = editDialogFor("House rent allowance");
    fireEvent.change(within(dialog).getByLabelText("Component Name"), {
      target: { value: "House rent" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      const sent = lastSent("/payroll/components/c-hra", "PATCH");
      expect(sent.body).toEqual({ name: "House rent" });
    });
  });

  it("sends only the toggled active flag and shows the BE's in-use refusal", async () => {
    payroll.refusals = {
      "PATCH /payroll/components": {
        status: 409,
        body: {
          error_code: "SALARY_COMPONENT_IN_USE",
          message:
            "Basic salary is still used by 1 employee's structure — Asha V. Remove it from their structure first.",
        },
      },
    };
    renderPayrollAt("/admin/company/payroll");
    await screen.findByText("Basic salary");
    const row = screen.getByText("Basic salary").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    const dialog = editDialogFor("Basic salary");
    fireEvent.click(within(dialog).getByLabelText(/Active/));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await screen.findByText(/is still used by/);
    const sent = lastSent("/payroll/components/c-basic", "PATCH");
    expect(sent.body).toEqual({ active: false });
  });

  it("refuses to send when nothing changed", async () => {
    renderPayrollAt("/admin/company/payroll");
    await screen.findByText("Basic salary");
    const row = screen.getByText("Basic salary").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    const dialog = editDialogFor("Basic salary");
    const save = within(dialog).getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    const patches = sentRequests().filter(
      (r) => r.url.includes("/payroll/components") && r.method === "PATCH",
    );
    expect(patches.length).toBe(0);
  });
});
