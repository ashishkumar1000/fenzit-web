import { describe, expect, it } from "bun:test";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { sentRequests } from "../testing/fetchMock";
import {
  lastSent,
  offCycleRow,
  payroll,
  renderPayrollAt,
  runRow,
  setUpPayrollPageTests,
} from "../testing/payrollPageKit";
import { istToday } from "../features/admin/format";
import type { LockView } from "../features/admin/payrollRunApi";

setUpPayrollPageTests();

const G_ROW = runRow({
  month: "2026-11",
  summary: {
    month: "2026-11",
    employees: 5,
    payslips: 5,
    skips: [
      {
        employee: "Chitra D",
        reason: "missing_join_date",
        detail:
          "no joining date on the employment record — set it in the employee profile and run again",
      },
    ],
    warnings: ["Asha V: no PAN on the employment record"],
    offCycle: { staged: 1, applied: 1, orphaned: [] },
    recovery: { outstandingBefore: "2646.15", outstandingAfter: "0.00", raisedThisRun: "2646.15" },
  },
});

describe("Payroll: the runs tab", () => {
  it("defaults the month to the newest run's month", async () => {
    payroll.runs.history = [G_ROW];
    renderPayrollAt("/admin/company/payroll?tab=runs");
    await screen.findByText("Run summary");
    expect(sentRequests().some((r) => r.url.includes("/payroll/months/2026-11"))).toBe(true);
    expect(
      sentRequests().some((r) => r.url.includes("/payroll/off-cycle-lines?month=2026-11")),
    ).toBe(true);
  });

  it("falls back to the current month on a fresh company", async () => {
    renderPayrollAt("/admin/company/payroll?tab=runs");
    await screen.findByText("Nobody has a joining date yet");
    // The fallback IS istToday — compute the expectation from the same
    // source so the test survives the wall clock leaving 2026-11.
    expect(
      sentRequests().some((r) => r.url.includes(`/payroll/months/${istToday().slice(0, 7)}`)),
    ).toBe(true);
  });

  it("renders the month's policy and the BE's reason as display copy", async () => {
    payroll.monthStatus = {
      month: "2026-11",
      divisorConvention: "fixed-26",
      cutoffDay: 25,
      payDate: 1,
      effectiveFrom: null,
      locked: false,
      firstPayrollMonth: "2026-09",
      notRunnableReason: null,
    };
    renderPayrollAt("/admin/company/payroll?tab=runs&month=2026-11");
    await screen.findByText("Governed by");
    expect(screen.getByText("The defaults")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Run payroll" })).toBeTruthy();
  });

  it("renders the completed summary exactly as the BE built it", async () => {
    payroll.runs.history = [G_ROW];
    renderPayrollAt("/admin/company/payroll?tab=runs");
    await screen.findByText("Run summary");
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getByText(/no joining date on the employment record/)).toBeTruthy();
    expect(screen.getByText("No joining date")).toBeTruthy();
    expect(screen.getByText(/no PAN on the employment record/)).toBeTruthy();
    expect(screen.getByText("₹2,646.15")).toBeTruthy();
    expect(screen.getByText(/1 on payslips/)).toBeTruthy();
  });

  it("renders the zero-employee completion as its own line, not an error", async () => {
    payroll.runs.history = [
      runRow({
        month: "2026-11",
        summary: {
          month: "2026-11",
          employees: 0,
          payslips: 0,
          skips: [],
          warnings: [],
          offCycle: { staged: 0, applied: 0, orphaned: [] },
          recovery: { outstandingBefore: "0.00", outstandingAfter: "0.00", raisedThisRun: "0.00" },
          status: "no_employees",
        },
      }),
    ];
    renderPayrollAt("/admin/company/payroll?tab=runs");
    await screen.findByText(/Nobody was on payroll this month/);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("triggers the run with the exact body and shows the BE's refusal verbatim", async () => {
    payroll.refusals = {
      "POST /payroll/runs": {
        status: 422,
        body: {
          error_code: "VALIDATION_ERROR",
          message:
            "the 2026-11 run opens on day 25 of the month (the attendance cut-off) — today is day 12",
        },
      },
    };
    renderPayrollAt("/admin/company/payroll?tab=runs&month=2026-11");
    await screen.findByRole("button", { name: "Run payroll" });
    fireEvent.click(screen.getByRole("button", { name: "Run payroll" }));
    await screen.findByText(/opens on day 25 of the month/);
    const sent = lastSent("/payroll/runs", "POST");
    expect(sent.body).toEqual({ month: "2026-11" });
  });

  it("shows the in-flight state with a refresh, the reclaim affordance, and fires nothing", async () => {
    payroll.runs.history = [runRow({ month: "2026-11", status: "running", finishedAt: null })];
    renderPayrollAt("/admin/company/payroll?tab=runs");
    // The same run shows in the month card, the run card and the history —
    // one pill each.
    expect((await screen.findAllByText("Running")).length).toBe(3);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
    // The re-post is the BE's reclaim (idempotent while genuinely running),
    // so the run form stays reachable during a run.
    expect(screen.getByRole("button", { name: "Run again" })).toBeTruthy();
    const posts = sentRequests().filter((r) => r.method === "POST");
    expect(posts.length).toBe(0);
  });

  it("offers the reclaiming re-run for a stale running row", async () => {
    const staleStarted = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    payroll.runs.history = [
      runRow({ month: "2026-11", status: "running", startedAt: staleStarted, finishedAt: null }),
    ];
    renderPayrollAt("/admin/company/payroll?tab=runs&month=2026-11");
    await screen.findByText(/it may have stalled/);
    expect(screen.getByRole("button", { name: "Run again" })).toBeTruthy();
  });

  it("sends the month on the 202-queued trigger and shows the queued run", async () => {
    const queued = runRow({
      month: "2026-11",
      status: "queued",
      startedAt: null,
      finishedAt: null,
    });
    payroll.refusals = {
      "POST /payroll/runs": { status: 202, body: queued as unknown as Record<string, unknown> },
    };
    renderPayrollAt("/admin/company/payroll?tab=runs&month=2026-11");
    fireEvent.click(await screen.findByRole("button", { name: "Run payroll" }));
    // Seed before the revalidation reads — the fake answers the POST
    // synchronously, so the follow-up GETs are the first thing that runs
    // after the click block.
    payroll.runs.history = [queued];
    await waitFor(() => {
      const sent = lastSent("/payroll/runs", "POST");
      expect(sent.body).toEqual({ month: "2026-11" });
    });
    // The revalidation reads the seeded history — the queued run renders in
    // the month card, the run card and the history.
    expect((await screen.findAllByText("Queued")).length).toBe(3);
  });

  it("renders the chosen month's failed run with the BE's message and the re-run", async () => {
    payroll.runs.history = [
      runRow({
        month: "2026-11",
        status: "failed",
        errorMessage: "the run executor stopped before finishing — re-run to retry",
      }),
    ];
    renderPayrollAt("/admin/company/payroll?tab=runs&month=2026-11");
    await screen.findByText("The run failed");
    expect(screen.getByText(/the run executor stopped before finishing/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Run again" })).toBeTruthy();
  });

  it("renders the runs tab's failed reads as one retry line", async () => {
    payroll.refusals = {
      "GET /payroll/months/2026-11": {
        status: 500,
        body: { error_code: "INTERNAL_ERROR", message: "boom" },
      },
    };
    renderPayrollAt("/admin/company/payroll?tab=runs&month=2026-11");
    await screen.findByText(/The run page could not load/);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("locks through the confirm dialog and renders the BE's confirmation verbatim", async () => {
    const lock: LockView = {
      month: "2026-11",
      lockedAt: "2026-11-25T04:00:00.000Z",
      lockedBy: "u-owner",
      confirmation: {
        statement:
          "November 2026's payroll is now final — its payslips, deductions and attendance can no longer change",
        permanence: "A lock cannot be undone — there is no unlock.",
        remedy: "Corrections after a lock ride the next month's off-cycle lines.",
        stagedOffCycleLines: [],
      },
    };
    payroll.runs.history = [G_ROW];
    renderPayrollAt("/admin/company/payroll?tab=runs");
    await screen.findByRole("button", { name: "Lock this month…" });
    // The page sits idle here — seed the post-lock world BEFORE the submit:
    // the POST answers the BE's 200 LockView, and the revalidation GETs find
    // the locked month. (Seeding after the click races the fake's answer.)
    payroll.refusals = {
      "POST /months/2026-11/lock": {
        status: 200,
        body: lock as unknown as Record<string, unknown>,
      },
    };
    payroll.runs.lock = lock;
    payroll.monthStatus = {
      ...payroll.monthStatus,
      locked: true,
    };
    fireEvent.click(screen.getByRole("button", { name: "Lock this month…" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Lock permanently" }));
    await waitFor(() => {
      const sent = lastSent("/payroll/months/2026-11/lock", "POST");
      expect(sent.body).toEqual({});
    });
    // After the save the loader refetches; the same dialog shows the BE's
    // receipt and the card behind renders its sentences read-only.
    expect(
      (await screen.findAllByText(/its payslips, deductions and attendance can no longer change/))
        .length,
    ).toBeGreaterThan(0);
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.getByText(/A lock cannot be undone/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Run payroll" })).toBeNull();
  });

  it("renders the month's off-cycle lines with their status", async () => {
    payroll.runs.offCycleLines = [
      offCycleRow({}),
      offCycleRow({ id: "oc-2", label: "Advance recovery", amount: -1200.5, status: "applied" }),
    ];
    renderPayrollAt("/admin/company/payroll?tab=runs");
    await screen.findByText("Festival bonus");
    expect(screen.getByText("₹5,000.00")).toBeTruthy();
    expect(screen.getByText("-₹1,200.50")).toBeTruthy();
    expect(screen.getByText("Waiting for the run")).toBeTruthy();
    expect(screen.getByText("On the payslips")).toBeTruthy();
    expect(screen.getByText(/Staging new lines from the console is coming/)).toBeTruthy();
  });

  it("lists the run history with statuses and month links", async () => {
    payroll.runs.history = [
      G_ROW,
      runRow({
        month: "2026-10",
        status: "failed",
        errorMessage: "the run executor stopped before finishing — re-run to retry",
      }),
    ];
    renderPayrollAt("/admin/company/payroll?tab=runs");
    await screen.findByText("Run history");
    expect(screen.getByText("Failed")).toBeTruthy();
    const octoberLink = screen.getByRole("link", { name: "2026-10" });
    expect(octoberLink.getAttribute("href")).toBe("/admin/company/payroll?tab=runs&month=2026-10");
  });

  it("saves the override with the acknowledgment and shows the BE's refusal verbatim", async () => {
    payroll.refusals = {
      "PUT /run-override": {
        status: 422,
        body: {
          error_code: "VALIDATION_ERROR",
          message: "the override amount cannot be zero — enter what the run should pay instead",
        },
      },
    };
    renderPayrollAt("/admin/company/payroll?tab=runs&month=2026-11");
    fireEvent.click(await screen.findByRole("button", { name: "Override a statutory amount" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Employee" }));
    fireEvent.click(screen.getByRole("option", { name: /Asha V/ }));
    fireEvent.change(within(dialog).getByLabelText("Amount per month"), {
      target: { value: "12000.50" },
    });
    // The employer-liability acknowledgment gates the save.
    const save = (): HTMLButtonElement =>
      within(dialog).getByRole("button", { name: "Save override" }) as HTMLButtonElement;
    expect(save().disabled).toBe(true);
    fireEvent.click(within(dialog).getByLabelText(/employer-liability acknowledgment/));
    expect(save().disabled).toBe(false);
    fireEvent.click(save());
    await screen.findByText(/the override amount cannot be zero/);
    expect(within(dialog).getByRole("alert")).toBeTruthy();
    await waitFor(() => {
      const sent = lastSent("/run-override", "PUT");
      expect(sent.body).toEqual({
        month: "2026-11",
        field: "pf_employee",
        amount: "12000.50",
        acknowledgedLiability: true,
      });
    });
  });

  it("saves the override and shows the saved note", async () => {
    renderPayrollAt("/admin/company/payroll?tab=runs&month=2026-11");
    fireEvent.click(await screen.findByRole("button", { name: "Override a statutory amount" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Employee" }));
    fireEvent.click(screen.getByRole("option", { name: /Asha V/ }));
    fireEvent.change(within(dialog).getByLabelText("Amount per month"), {
      target: { value: "12000.50" },
    });
    fireEvent.click(within(dialog).getByLabelText(/employer-liability acknowledgment/));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save override" }));
    await screen.findByText("Override saved");
    const sent = lastSent("/run-override", "PUT");
    expect(sent.body).toEqual({
      month: "2026-11",
      field: "pf_employee",
      amount: "12000.50",
      acknowledgedLiability: true,
    });
  });
});
