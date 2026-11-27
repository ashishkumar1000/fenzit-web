import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { JobsTable } from "./JobsTable";
import type { JobRow } from "../companyApi";

// The console jobs table's cells: the work leads the Job cell and the number
// answers "which job" beneath it (a rejected job's owner reason instead), the
// Customer cell carries the visit's place, and the Employee cell opens the
// person's profile. (The Step column retired 2026-11-28 — the job detail
// page holds the step; the member My-Jobs tab keeps its own.)

afterEach(cleanup);

function row(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: "j-1",
    jobNumber: "JB-2026-0008",
    status: "completed",
    priority: "normal",
    scheduledStart: "2026-11-12T03:30:00Z",
    currentStep: null,
    skill: { id: "s-1", name: "Pipe Leak Repair" },
    technician: { id: "u-1", name: "Amit Sharma" },
    customer: { id: "c-1", name: "Sharma General Store" },
    description: null,
    serviceLocation: "12 Nehru Road",
    completedAt: null,
    createdAt: "2026-11-12T02:00:00Z",
    decidedAt: null,
    rejectionReason: null,
    currentStepIndex: null,
    workflowTemplate: null,
    ...overrides,
  };
}

describe("JobsTable: the cells", () => {
  it("renders the seven trimmed columns — no Current Step (the detail page holds it)", () => {
    renderTable(<JobsTable rows={[row()]} />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "Job Details",
      "Customer",
      "Status",
      "Work Type",
      "Employee",
      "Priority",
      "Scheduled Date",
    ]);
  });

  it("links the employee cell to the person's profile", () => {
    renderTable(<JobsTable rows={[row()]} />);
    const link = screen.getByRole("link", { name: "Amit Sharma" });
    expect(link).toHaveAttribute("href", "/admin/company/employees/u-1");
  });

  it("reads a dash for a job with no technician and no name", () => {
    renderTable(
      <JobsTable
        rows={[
          row({ technician: null }),
          row({ id: "j-2", jobNumber: "JB-2026-0009", technician: { id: "u-2", name: "" } }),
        ]}
      />,
    );
    // The Employee column is the fifth: the dash is its whole content, and
    // neither row carries a profile link.
    for (const number of ["JB-2026-0008", "JB-2026-0009"]) {
      const tr = screen.getByText(number).closest("tr")!;
      const employeeCell = tr.querySelectorAll("td")[4];
      expect(employeeCell.textContent).toBe("—");
      expect(employeeCell.querySelector("a")).toBeNull();
    }
  });

  // Every Job cell is a router Link, so the table only renders inside a router.
  function renderTable(ui: React.ReactElement) {
    const router = createMemoryRouter([{ path: "*", element: ui }], {
      initialEntries: ["/admin/company/jobs"],
    });
    render(<RouterProvider router={router} />);
  }

  it("leads the Job cell with the work and answers which job underneath", () => {
    renderTable(<JobsTable rows={[row({ description: "Split AC not cooling" })]} />);
    const link = screen.getByText("Split AC not cooling").closest("a");
    expect(link?.textContent).toBe("Split AC not coolingJB-2026-0008");
    expect(link?.getAttribute("href")).toBe("/admin/company/jobs/j-1");
  });

  it("falls back to the place when a job has no description", () => {
    renderTable(<JobsTable rows={[row()]} />);
    const link = screen.getByText("JB-2026-0008").closest("a");
    expect(link?.textContent).toBe("JB-2026-000812 Nehru Road");
  });

  it("counts an empty description as no description, so the title never renders blank", () => {
    renderTable(<JobsTable rows={[row({ description: "" })]} />);
    const link = screen.getByText("JB-2026-0008").closest("a");
    expect(link?.textContent).toBe("JB-2026-000812 Nehru Road");
  });

  it("shows a rejected job's reason and keeps its number beside it", () => {
    renderTable(
      <JobsTable
        rows={[row({ status: "rejected", description: "AC service", rejectionReason: "Bad work" })]}
      />,
    );
    expect(screen.getByText("AC service")).toBeTruthy();
    expect(screen.getByText("Bad work – Job Number: JB-2026-0008")).toBeTruthy();
  });

  it("says no reason was given when the owner declined without one", () => {
    renderTable(
      <JobsTable rows={[row({ status: "rejected", description: null, rejectionReason: null })]} />,
    );
    expect(screen.getByText("No reason given.")).toBeTruthy();
  });

  it("carries the visit's place under the customer's name", () => {
    renderTable(
      <JobsTable rows={[row({ customer: { id: "c-1", name: "Sharma General Store" } })]} />,
    );
    const cell = screen.getByText("Sharma General Store").closest("div");
    expect(cell?.textContent).toContain("12 Nehru Road");
  });

  it("wears the Urgent pill only on urgent dispatches", () => {
    renderTable(
      <JobsTable
        rows={[
          row({ id: "j-1", priority: "urgent" }),
          row({ id: "j-2", jobNumber: "JB-2026-0009", priority: "normal" }),
        ]}
      />,
    );
    expect(screen.getAllByText("Urgent").length).toBe(1);
  });
});
