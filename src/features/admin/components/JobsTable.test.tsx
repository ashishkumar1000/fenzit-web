import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { JobsTable } from "./JobsTable";
import type { JobRow } from "../companyApi";

// The console jobs table's cells: the work leads the Job cell and the number
// answers "which job" beneath it (a rejected job's owner reason instead), the
// Customer cell carries the visit's place, and the Step cell never reads
// "Step 7 of 5" when the template shrank under a running job.

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
    expect(screen.getByText("Bad work · JB-2026-0008")).toBeTruthy();
  });

  it("says no reason was given when the owner declined without one", () => {
    renderTable(
      <JobsTable rows={[row({ status: "rejected", description: null, rejectionReason: null })]} />,
    );
    expect(screen.getByText("No reason given")).toBeTruthy();
  });

  it("carries the visit's place under the customer's name", () => {
    renderTable(
      <JobsTable rows={[row({ customer: { id: "c-1", name: "Sharma General Store" } })]} />,
    );
    const cell = screen.getByText("Sharma General Store").closest("div");
    expect(cell?.textContent).toContain("12 Nehru Road");
  });

  it("reads the step of the template while the job is on it", () => {
    renderTable(
      <JobsTable
        rows={[
          row({
            status: "in_progress",
            currentStep: "photo",
            currentStepIndex: 1,
            workflowTemplate: { version: 1, steps: [{}, {}, {}, {}, {}] as never },
          }),
        ]}
      />,
    );
    expect(screen.getByText("Step 2 of 5")).toBeTruthy();
  });

  it("never reads Step 6 of 5 when the template shrank under the job", () => {
    renderTable(
      <JobsTable
        rows={[
          row({
            status: "in_progress",
            currentStep: "completed",
            currentStepIndex: 5,
            workflowTemplate: { version: 1, steps: [{}, {}, {}, {}, {}] as never },
          }),
        ]}
      />,
    );
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.queryByText(/Step \d+ of 5/)).toBeNull();
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
