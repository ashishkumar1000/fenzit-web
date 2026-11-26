import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentTo,
  setRespond,
  useApiBase,
} from "../../testing/fetchMock";
import { SESSION_KEY } from "../../services/session";
import { getToastsSnapshot, resetToastsForTests } from "../../components/ui/toastStore";
import type { PayrollRunView } from "./payrollRunApi";
import {
  resumePayrollRunWatch,
  setPayrollRunRevalidator,
  setPayrollRunWatcherDelaysForTests,
  resetPayrollRunWatcherForTests,
  watchPayrollRun,
} from "./payrollRunWatcher";

// The run watcher's contract, pinned at its module seam: a triggered or
// resumed in-flight run is polled on the EXISTING runs list; its terminal
// transition toasts exactly once (completion polite, failure loud with the
// BE's own copy), revalidates the mounted page, and stops the loop; the
// per-run budget stops the watch silently when the BE keeps saying running.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const queuedRun = (id: string): PayrollRunView => ({
  id,
  month: "2026-10",
  status: "queued",
  summary: null,
  errorMessage: null,
  startedAt: null,
  finishedAt: null,
});

const completedRun = (id: string, payslips: number): PayrollRunView => ({
  id,
  month: "2026-10",
  status: "completed",
  summary: {
    month: "2026-10",
    employees: 2,
    payslips,
    skips: [],
    warnings: [],
    offCycle: { staged: 0, applied: 0, orphaned: [] },
    recovery: { outstandingBefore: "0.00", outstandingAfter: "0.00", raisedThisRun: "0.00" },
  },
  errorMessage: null,
  startedAt: "2026-11-26T10:00:00Z",
  finishedAt: "2026-11-26T10:05:00Z",
});

const failedRun = (id: string): PayrollRunView => ({
  id,
  month: "2026-10",
  status: "failed",
  summary: null,
  errorMessage: "The attendance cut-off data was unavailable.",
  startedAt: "2026-11-26T10:00:00Z",
  finishedAt: "2026-11-26T10:02:00Z",
});

let revalidates = 0;

beforeEach(() => {
  installFetchMock();
  resetToastsForTests();
  resetPayrollRunWatcherForTests();
  setPayrollRunWatcherDelaysForTests(15, 40);
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: "t-watcher", name: null }));
  revalidates = 0;
  setPayrollRunRevalidator(() => {
    revalidates += 1;
  });
});

afterEach(() => {
  restoreFetchMock();
  resetToastsForTests();
  resetPayrollRunWatcherForTests();
  window.localStorage.removeItem(SESSION_KEY);
});

const runCalls = () => sentTo("/api/v1/payroll/runs");

describe("payrollRunWatcher", () => {
  test("a triggered run's completion toasts once, revalidates the page, and stops", async () => {
    setRespond((url) => {
      if (url.endsWith("/api/v1/payroll/runs")) {
        return jsonResponse([completedRun("run-1", 3)]);
      }
      return jsonResponse({});
    });

    watchPayrollRun(queuedRun("run-1"));
    await sleep(120);

    const toasts = getToastsSnapshot();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.tone).toBe("success");
    expect(toasts[0]?.message).toContain("October 2026");
    expect(toasts[0]?.message).toContain("3 salary slips created");
    expect(revalidates).toBe(1);

    const calls = runCalls().length;
    expect(calls).toBeGreaterThanOrEqual(1);
    await sleep(60);
    expect(runCalls().length).toBe(calls);
  });

  test("a failed run toasts the BE's own copy as an alert", async () => {
    setRespond((url) => {
      if (url.endsWith("/api/v1/payroll/runs")) {
        return jsonResponse([failedRun("run-2")]);
      }
      return jsonResponse({});
    });

    watchPayrollRun(queuedRun("run-2"));
    await sleep(120);

    const toasts = getToastsSnapshot();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.tone).toBe("error");
    expect(toasts[0]?.message).toBe("The attendance cut-off data was unavailable.");
    expect(revalidates).toBe(1);
  });

  test("the budget stops the watch silently while the run stays in flight", async () => {
    setRespond((url) => {
      if (url.endsWith("/api/v1/payroll/runs")) {
        return jsonResponse([queuedRun("run-3")]);
      }
      return jsonResponse({});
    });

    watchPayrollRun(queuedRun("run-3"));
    await sleep(200);

    expect(getToastsSnapshot()).toHaveLength(0);
    const calls = runCalls().length;
    expect(calls).toBeGreaterThanOrEqual(2);
    await sleep(60);
    expect(runCalls().length).toBe(calls);
  });

  test("resume joins an in-flight run from the loader, and a watched run that came back terminal through a refetch settles once", async () => {
    // A longer budget: this test waits out two polls, and the entry must
    // still be watched when the refetched completion settles it.
    setPayrollRunWatcherDelaysForTests(15, 5_000);
    let status: PayrollRunView["status"] = "queued";
    setRespond((url) => {
      if (url.endsWith("/api/v1/payroll/runs")) {
        return jsonResponse([{ ...queuedRun("run-4"), status }]);
      }
      return jsonResponse({});
    });

    resumePayrollRunWatch([queuedRun("run-4")]);
    await sleep(100);

    // The watch joined without a toast for the state it started with.
    expect(getToastsSnapshot()).toHaveLength(0);

    // A loader refetch saw the completion first — settling through the
    // resume toasts exactly once, then a second resume says nothing.
    status = "completed";
    resumePayrollRunWatch([{ ...queuedRun("run-4"), status: "completed" }]);
    expect(getToastsSnapshot()).toHaveLength(1);
    resumePayrollRunWatch([{ ...queuedRun("run-4"), status: "completed" }]);
    expect(getToastsSnapshot()).toHaveLength(1);
    expect(revalidates).toBe(1);
  });

  test("without a signed-in session nothing polls", async () => {
    window.localStorage.removeItem(SESSION_KEY);
    watchPayrollRun(queuedRun("run-5"));
    await sleep(80);
    expect(runCalls()).toHaveLength(0);
    expect(getToastsSnapshot()).toHaveLength(0);
  });
});
