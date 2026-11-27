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
 * The employment dialog lives on the employee's profile page (the team
 * table's Employment column retired 2026-11-28), so these tests render the
 * profile through the payroll kit — its fake answers the profile and
 * employment reads — and drive the dialog via the master record's
 * "Complete Employee Details" banner (the default fixture always misses a
 * statutory field, so the banner is always up). The form's four sections
 * are a tablist: fields on other sections are not mounted, so a test
 * switches to the section it is about.
 */

setUpPayrollPageTests();

/** Opens the dialog from Asha's profile and waits for the form's header. */
async function openDialog(): Promise<void> {
  renderPayrollAt("/admin/company/employees/u-a");
  await screen.findByRole("heading", { name: "Asha V" });
  fireEvent.click(screen.getByRole("button", { name: "Complete Employee Details" }));
  // The rail only renders once the employment read lands; the header alone
  // is present during loading, so wait for the form. The banner lands on
  // the first missing statutory field — every test starts from the Job
  // section, the section the old row-button entry opened, and switches
  // from there.
  await screen.findByRole("tab", { name: /^Job/ });
  fireEvent.click(screen.getByRole("tab", { name: /^Job/ }));
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
    openSection("Govt IDs");
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
    await screen.findByText(/Saved\. The profile now shows/);
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
    openSection("Govt IDs");
    fireEvent.change(screen.getByLabelText("PAN"), { target: { value: "" } });
    const before = sentRequests().filter(
      (r) => r.method === "GET" && r.url.includes("/members/u-a/employment"),
    ).length;
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await screen.findByText(/Saved\. The profile now shows/);
    const sent = lastSent("/members/u-a/employment", "PATCH");
    expect(sent.body).toEqual({ fatherName: null, joinDate: null, pan: null });
    // Closing revalidates the hosting profile route — the master record's
    // employment read runs again with the saved values.
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    await waitFor(() => {
      const after = sentRequests().filter(
        (r) => r.method === "GET" && r.url.includes("/members/u-a/employment"),
      ).length;
      expect(after).toBeGreaterThan(before);
    });
  });

  it("blocks a cleared employee code before send", async () => {
    await openDialog();
    fireEvent.change(screen.getByLabelText("Employee code"), { target: { value: "" } });
    const save = within(screen.getByRole("dialog")).getByRole("button", {
      name: "Save",
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    // The field error and the footer reason agree, and the button points at
    // the reason, so a keyboard user is told why it is closed.
    const reason = save.getAttribute("aria-describedby");
    expect(reason).toBeTruthy();
    expect(document.getElementById(reason ?? "")?.textContent).toBe(
      "The employee code cannot be cleared.",
    );
    expect(screen.getAllByText("The employee code cannot be cleared.")).toHaveLength(2);
  });

  it("warns only when clearing a joining date would remove salary runs", async () => {
    await openDialog();
    expect(screen.queryByText("This employee will be left out of salary runs.")).toBeNull();
    fireEvent.change(screen.getByLabelText("Joining date"), { target: { value: "" } });
    expect(screen.getByText("This employee will be left out of salary runs.")).toBeTruthy();
  });

  it("stays quiet for an employee who never had a joining date", async () => {
    payroll.employment["u-a"] = employmentRow("u-a", { joinDate: null });
    await openDialog();
    // Opening the dialog is not an edit: nothing is being cleared, so the
    // payroll warning must not appear before the owner touches the field.
    expect(screen.queryByText("This employee will be left out of salary runs.")).toBeNull();
    openSection("Job");
    expect(screen.getByLabelText("Joining date")).toBeTruthy();
    expect(screen.queryByText("This employee will be left out of salary runs.")).toBeNull();
  });

  it("uppercases PAN as it is typed", async () => {
    await openDialog();
    openSection("Govt IDs");
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
    renderPayrollAt("/admin/company/employees/u-a");
    await screen.findByRole("heading", { name: "Asha V" });
    // With the employment read failed there is no setup banner — the master
    // record's "Open Anyway" is that state's dialog entry.
    fireEvent.click(screen.getByRole("button", { name: "Open Anyway" }));
    await screen.findByText("This person is not on the team any more.");
  });
});
