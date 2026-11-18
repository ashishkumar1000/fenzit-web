import { describe, expect, it } from "bun:test";
import { fireEvent, screen, within } from "@testing-library/react";
import { sentRequests } from "../testing/fetchMock";
import { waitFor } from "@testing-library/react";
import {
  employmentRow,
  lastSent,
  payroll,
  renderPayrollAt,
  setUpPayrollPageTests,
} from "../testing/payrollPageKit";

/** The kit's refusals are method-keyed; the employment PATCH carries the
 *  exit-before-join rule's plain-English copy. */
function refuseEmploymentPatch(): void {
  payroll.refusals = {
    "PATCH /employment": {
      status: 422,
      body: {
        error_code: "VALIDATION_ERROR",
        message:
          "A leaving date needs a joining date first — set the joining date, then the leaving date.",
      },
    },
  };
}

/**
 * The employment dialog lives on the Employees page (its table column), so
 * these tests render the employees page through the payroll kit — its fake
 * answers the employees reads too — and drive the dialog via the cell
 * button.
 */

setUpPayrollPageTests();

describe("Employees: the employment dialog", () => {
  it("opens with a fresh read and prefills the loaded row", async () => {
    payroll.employment["u-a"] = employmentRow("u-a", {
      designation: "Field technician",
      pan: "ABCPE1234F",
    });
    renderPayrollAt("/admin/company/employees");
    await screen.findByText("Asha V");
    const row = screen.getByText("Asha V").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Employment" }));
    await screen.findByText("Employment details — E-u-a");
    expect((screen.getByLabelText("Designation") as HTMLInputElement).value).toBe(
      "Field technician",
    );
    expect((screen.getByLabelText("PAN") as HTMLInputElement).value).toBe("ABCPE1234F");
    expect(
      sentRequests().some((r) => r.url.includes("/members/u-a/employment") && r.method === "GET"),
    ).toBe(true);
  });

  it("sends only the changed field — untouched keys never ride the wire", async () => {
    renderPayrollAt("/admin/company/employees");
    await screen.findByText("Asha V");
    const row = screen.getByText("Asha V").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Employment" }));
    await screen.findByText("Employment details — E-u-a");
    fireEvent.change(screen.getByLabelText("Designation"), {
      target: { value: "Senior technician" },
    });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await screen.findByText(/Saved\. The team list/);
    const sent = lastSent("/members/u-a/employment", "PATCH");
    expect(sent.body).toEqual({ designation: "Senior technician" });
  });

  it("clears an emptied touched field with the BE's null verb", async () => {
    payroll.employment["u-a"] = employmentRow("u-a", {
      fatherName: "Ramesh Sharma",
      joinDate: "2026-09-01",
      pan: "ABCPE1234F",
    });
    renderPayrollAt("/admin/company/employees");
    await screen.findByText("Asha V");
    const row = screen.getByText("Asha V").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Employment" }));
    await screen.findByText("Employment details — E-u-a");
    // All three field families clear the same way: the action turns the
    // dialog's "" into JSON null (shaped fields refuse "" outright).
    fireEvent.change(screen.getByLabelText("Father's name"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Joining date"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("PAN"), { target: { value: "" } });
    const before = sentRequests().filter((r) => r.url.includes("/members/page")).length;
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await screen.findByText(/Saved\. The team list/);
    const sent = lastSent("/members/u-a/employment", "PATCH");
    expect(sent.body).toEqual({ fatherName: null, joinDate: null, pan: null });
    // Closing refreshes the team list — the code column's refresh, pinned.
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    await waitFor(() => {
      const after = sentRequests().filter((r) => r.url.includes("/members/page")).length;
      expect(after).toBe(before + 1);
    });
  });

  it("blocks a cleared employee code before send", async () => {
    renderPayrollAt("/admin/company/employees");
    await screen.findByText("Asha V");
    const row = screen.getByText("Asha V").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Employment" }));
    await screen.findByText("Employment details — E-u-a");
    fireEvent.change(screen.getByLabelText("Employee code"), { target: { value: "" } });
    const save = within(screen.getByRole("dialog")).getByRole("button", {
      name: "Save",
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(screen.getByText("The employee code cannot be cleared.")).toBeTruthy();
  });

  it("uppercases PAN as it is typed", async () => {
    renderPayrollAt("/admin/company/employees");
    await screen.findByText("Asha V");
    const row = screen.getByText("Asha V").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Employment" }));
    await screen.findByText("Employment details — E-u-a");
    fireEvent.change(screen.getByLabelText("PAN"), { target: { value: "abcpe1234f" } });
    expect((screen.getByLabelText("PAN") as HTMLInputElement).value).toBe("ABCPE1234F");
  });

  it("shows the BE's refusal verbatim — exit before join", async () => {
    refuseEmploymentPatch();
    renderPayrollAt("/admin/company/employees");
    await screen.findByText("Asha V");
    const row = screen.getByText("Asha V").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Employment" }));
    await screen.findByText("Employment details — E-u-a");
    fireEvent.change(screen.getByLabelText("Leaving date"), { target: { value: "2026-12-01" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await screen.findByText(/needs a joining date first/);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("says the person is gone when the read 404s", async () => {
    payroll.employment = {};
    renderPayrollAt("/admin/company/employees");
    await screen.findByText("Asha V");
    const row = screen.getByText("Asha V").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Employment" }));
    await screen.findByText("This person is not on the team any more.");
  });
});
