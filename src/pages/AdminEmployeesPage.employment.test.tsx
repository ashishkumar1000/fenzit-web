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
 * button. The form's four sections are a tablist: fields on other sections
 * are not mounted, so a test switches to the section it is about.
 */

setUpPayrollPageTests();

/** Opens the dialog from Asha's row and waits for the form's header. */
async function openDialog(): Promise<void> {
  renderPayrollAt("/admin/company/employees");
  await screen.findByText("Asha V");
  const row = screen.getByText("Asha V").closest("tr")!;
  fireEvent.click(within(row).getByRole("button", { name: "Employment" }));
  // The rail only renders once the employment read lands; the header alone
  // is present during loading, so wait for the form.
  await screen.findByRole("tab", { name: /^Job/ });
}

/** Switches the section rail. The accessible name gains an unsaved count
 *  when the section is dirty, so match its start. */
function openSection(name: string): void {
  fireEvent.click(screen.getByRole("tab", { name: new RegExp(`^${name}`) }));
}

describe("Employees: the employment dialog", () => {
  it("opens with a fresh read and prefills the loaded row", async () => {
    payroll.employment["u-a"] = employmentRow("u-a", {
      designation: "Field technician",
      pan: "ABCPE1234F",
    });
    await openDialog();
    expect((screen.getByLabelText("Designation") as HTMLInputElement).value).toBe(
      "Field technician",
    );
    openSection("Statutory IDs");
    expect((screen.getByLabelText("PAN") as HTMLInputElement).value).toBe("ABCPE1234F");
    expect(
      sentRequests().some((r) => r.url.includes("/members/u-a/employment") && r.method === "GET"),
    ).toBe(true);
  });

  it("sends only the changed field — untouched keys never ride the wire", async () => {
    await openDialog();
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
    await openDialog();
    // All three field families clear the same way: the action turns the
    // dialog's "" into JSON null (shaped fields refuse "" outright).
    openSection("Personal");
    fireEvent.change(screen.getByLabelText("Father's name"), { target: { value: "" } });
    openSection("Job");
    fireEvent.change(screen.getByLabelText("Joining date"), { target: { value: "" } });
    openSection("Statutory IDs");
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
    await openDialog();
    fireEvent.change(screen.getByLabelText("Employee code"), { target: { value: "" } });
    const save = within(screen.getByRole("dialog")).getByRole("button", {
      name: "Save",
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(screen.getByText("The employee code cannot be cleared.")).toBeTruthy();
  });

  it("uppercases PAN as it is typed", async () => {
    await openDialog();
    openSection("Statutory IDs");
    fireEvent.change(screen.getByLabelText("PAN"), { target: { value: "abcpe1234f" } });
    expect((screen.getByLabelText("PAN") as HTMLInputElement).value).toBe("ABCPE1234F");
  });

  it("shows the BE's refusal verbatim — exit before join", async () => {
    refuseEmploymentPatch();
    await openDialog();
    fireEvent.change(screen.getByLabelText("Leaving date"), { target: { value: "2026-12-01" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await screen.findByText(/needs a joining date first/);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("keeps Save closed until a field changes, then counts the change on its tab", async () => {
    await openDialog();
    const save = within(screen.getByRole("dialog")).getByRole("button", {
      name: "Save",
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(screen.getByText("Change a field to save. Emptying one clears it.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Designation"), {
      target: { value: "Field manager" },
    });
    expect(save.disabled).toBe(false);
    expect(screen.getByRole("tab", { name: "Job, 1 unsaved change" })).toBeTruthy();
    expect(screen.getByText("1 change ready. Emptying a field clears it.")).toBeTruthy();
  });

  it("asks before a close would drop the edits", async () => {
    await openDialog();
    fireEvent.change(screen.getByLabelText("Designation"), {
      target: { value: "Field manager" },
    });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Discard your changes?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect((screen.getByLabelText("Designation") as HTMLInputElement).value).toBe("Field manager");

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("moves between sections with the arrow keys", async () => {
    await openDialog();
    const job = screen.getByRole("tab", { name: "Job" });
    job.focus();
    fireEvent.keyDown(job, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Personal" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByLabelText("Father's name")).toBeTruthy();
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
