import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { writeSession } from "../../../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../../../testing/fetchMock";
import { ExportJobsButton } from "./JobsExport";

// The Download list control builds the whole book's CSV in the browser: every
// page of /jobs/page (≤100 rows each), not just the one on screen, with the
// UTF-8 byte-order mark so Excel reads accents right, formula-triggering free
// text neutralized, and the last partial page never overcounting progress.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

let savedBlob: Blob | null = null;
let createObjectUrlCalls = 0;

beforeEach(() => {
  savedBlob = null;
  createObjectUrlCalls = 0;
  installFetchMock();
  setRespond(respondDefault);
  // happy-dom cannot resolve a blob: URL — the stub captures the blob the
  // builder made and answers without navigating.
  URL.createObjectURL = ((blob: Blob) => {
    savedBlob = blob;
    createObjectUrlCalls += 1;
    return "blob:stub";
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
});

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  cleanup();
});

function jobRow(n: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `j-${n}`,
    jobNumber: `JB-2026-${String(n).padStart(4, "0")}`,
    status: "completed",
    priority: n === 1 ? "urgent" : "normal",
    scheduledStart: "2026-11-15T04:30:00Z",
    currentStep: null,
    currentStepIndex: null,
    skill: { id: "s-1", name: "AC Service" },
    technician: { id: "u-1", name: "Amit Sharma" },
    customer: { id: "c-1", name: "Sharma General Store" },
    description: "Split AC not cooling",
    serviceLocation: "Nehru Road",
    completedAt: "2026-11-15T09:00:00Z",
    createdAt: "2026-11-14T10:00:00Z",
    decidedAt: null,
    rejectionReason: null,
    workflowTemplate: null,
    ...overrides,
  };
}

function envelope(rows: Record<string, unknown>[], total: number, page: number): Response {
  return jsonResponse({
    data: rows,
    total,
    page,
    pageSize: 100,
    pages: Math.max(1, Math.ceil(total / 100)),
    stats: {
      total,
      scheduled: 0,
      inProgress: 0,
      pendingApproval: 0,
      completed: total,
      cancelled: 0,
      rejected: 0,
      completed30d: total,
    },
  });
}

function respondDefault(url: string): Response {
  if (url.includes("/jobs/page")) {
    const page = Number(new URL(url).searchParams.get("page") ?? "1");
    if (page === 1) {
      return envelope(
        Array.from({ length: 100 }, (_, i) =>
          jobRow(
            i + 1,
            i === 0
              ? { description: "=cmd|danger" }
              : i === 1
                ? { customer: { id: "c-2", name: "=Weird Traders" } }
                : {},
          ),
        ),
        120,
        1,
      );
    }
    return envelope(
      Array.from({ length: 20 }, (_, i) => jobRow(101 + i)),
      120,
      2,
    );
  }
  throw new TypeError(`offline in tests: ${url}`);
}

describe("JobsExport: the whole-book CSV walk", () => {
  it("walks every page, names the file jobs.csv and stops at the real total", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const { getByRole } = render(<ExportJobsButton />);
    fireEvent.click(getByRole("button", { name: /Download list/ }));
    await waitFor(() => expect(createObjectUrlCalls).toBe(1));
    // Two pages for 120 rows at 100/page — never more than the walk needs.
    expect(sentRequests().filter((r) => r.url.includes("/jobs/page")).length).toBe(2);
    const text = await (savedBlob as unknown as Blob).text();
    expect(text.startsWith("﻿")).toBe(true);
    const lines = text.split("\n");
    expect(lines.length).toBe(121); // header + 120 rows
    // The byte-order mark rides the first line, before the header.
    expect(lines[0]).toBe(
      "\ufeffJob number,Description,Customer,Employee,Skill,Status,Priority,Place,Scheduled,Completed",
    );
    // The last partial page reports 120 fetched, never 200.
    expect(lines[120]).toContain('"JB-2026-0120"');
  });

  it("guards formula-triggering descriptions and humanizes the fixed words", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const { getByRole } = render(<ExportJobsButton />);
    fireEvent.click(getByRole("button", { name: /Download list/ }));
    await waitFor(() => expect(createObjectUrlCalls).toBe(1));
    const text = await (savedBlob as unknown as Blob).text();
    // The leading = gets a quote-prefix so the spreadsheet reads it as text.
    expect(text).toContain('"\'=cmd|danger"');
    // Names are free text too — a customer typed "=Weird Traders" once.
    expect(text).toContain('"\'=Weird Traders"');
    // Status and priority carry the words, not the wire values.
    expect(text).toContain('"Completed"');
    expect(text).toContain('"Urgent"');
    expect(text).not.toContain('"in_progress"');
  });

  it("says the file could not be built when a page fails", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    setRespond((url) => (url.includes("/jobs/page") ? jsonResponse({}, 500) : respondDefault(url)));
    const { getByRole, findByText } = render(<ExportJobsButton />);
    fireEvent.click(getByRole("button", { name: /Download list/ }));
    expect(await findByText("The file could not be created. Try again.")).toBeTruthy();
    expect(createObjectUrlCalls).toBe(0);
  });
});
