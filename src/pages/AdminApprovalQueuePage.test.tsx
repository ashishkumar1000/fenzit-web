import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { writeSession } from "../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// The owner's approval queue (Epic 22, CAP-5/CAP-10): rows and their
// fallbacks, filters that combine through the URL, the decided-elsewhere 409
// shown beside its row or at page level when the list has moved on, the
// cursor page link that keeps the filters, and the edit form that never
// silently clears a field whose picker list failed.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

let queueRows: Array<Record<string, unknown>>;
let conflictOnPost: boolean;
let queueDropsJ1: boolean;
let queueExhausted: boolean;
let editDetail: Record<string, unknown> | null;
let patchConflicts: boolean;
let skillsFail: boolean;
let customersFail: boolean;
let membersFail: boolean;
let jobsCalls: number;

beforeEach(() => {
  queueRows = [row("j1", "JOB-1", "Priya Nair", "Sharma Traders"), row("j2", "JOB-2", null, null)];
  conflictOnPost = false;
  queueDropsJ1 = false;
  queueExhausted = false;
  editDetail = null;
  patchConflicts = false;
  skillsFail = false;
  customersFail = false;
  membersFail = false;
  jobsCalls = 0;
  installFetchMock();
  setRespond(respondDefault);
});

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  cleanup();
});

function row(
  id: string,
  jobNumber: string,
  employeeName: string | null,
  customerName: string | null,
): Record<string, unknown> {
  return {
    id,
    jobNumber,
    submittedAt: "2026-11-13T05:30:00Z",
    ageHours: 26,
    employee: employeeName === null ? null : { id: "u-emp", name: employeeName },
    customerName,
  };
}

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    return jsonResponse({
      id: "u-owner",
      role: "company_admin",
      name: "Ravi Kumar",
      platformAdmin: false,
      email: null,
      countryCode: "+91",
      phoneNumber: "9900000001",
      employeeCode: null,
      status: "active",
    });
  }
  if (url.endsWith("/members")) {
    if (membersFail) return jsonResponse({}, 500);
    return jsonResponse([
      member("u-owner", "Ravi Kumar", "company_admin", "active"),
      member("u-emp", "Priya Nair", "employee", "active"),
      member("u-gone", "Old Hand", "employee", "removed"),
    ]);
  }
  if (url.includes("/approval-queue")) {
    const rows = queueDropsJ1 ? queueRows.filter((r) => r.id !== "j1") : queueRows;
    return jsonResponse({
      data: rows,
      nextCursor: queueExhausted ? null : "c-next",
      hasMore: !queueExhausted && rows.length > 0,
    });
  }
  if (/\/jobs\/j1$/.test(url)) {
    jobsCalls += 1;
    if (editDetail === null) return jsonResponse({}, 500);
    // The first hit is the loader's detail GET; a later hit is the form's
    // PATCH, which the backend answers 409 when the job stopped pending.
    if (patchConflicts && jobsCalls === 2) {
      return jsonResponse({ error_code: "JOB_NOT_MODIFIABLE" }, 409);
    }
    return jsonResponse(editDetail);
  }
  if (url.includes("/approval") && url.includes("/jobs/")) {
    // The decision endpoint: the backend answers 409 when someone decided first.
    if (conflictOnPost) return jsonResponse({ error_code: "JOB_NOT_PENDING" }, 409);
    return jsonResponse({}, 200);
  }
  if (url.endsWith("/skills")) {
    return skillsFail
      ? jsonResponse({}, 500)
      : jsonResponse({ skills: [{ id: "s1", name: "AC service" }] });
  }
  if (url.includes("/customers")) {
    return customersFail
      ? jsonResponse({}, 500)
      : jsonResponse({ data: [{ id: "c1", name: "Sharma Traders" }], nextCursor: null });
  }
  throw new TypeError(`offline in tests: ${url}`);
}

function member(
  userId: string,
  name: string | null,
  role: string,
  status: string,
): Record<string, unknown> {
  return {
    userId,
    name,
    countryCode: "+91",
    phoneNumber: "9800000000",
    employeeCode: "E-1",
    role,
    status,
    createdAt: "2026-01-01T00:00:00Z",
    canCreateJobs: role === "employee",
    jobApprovalRequired: true,
  };
}

function editJob(status = "pending_approval"): Record<string, unknown> {
  return {
    id: "j1",
    jobNumber: "JOB-1",
    customerId: "c-cur",
    technicianId: "t-cur",
    serviceLocation: "Andheri West",
    scheduledStart: "2026-11-15T05:00:00Z",
    scheduledEnd: null,
    status,
    priority: "normal",
    description: "Fan repair",
    notesForTechnician: null,
    skill: { id: "s-cur", name: "Current skill" },
    customer: { name: "Current customer" },
    technician: { name: "Current hand" },
  };
}

function renderQueue(entry = "/admin/company/approvals"): void {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
}

describe("AdminApprovalQueuePage: the rows", () => {
  it("renders the rows in the order the queue returns them — oldest first", async () => {
    queueRows = [
      row("j1", "JOB-1", "Priya Nair", "Sharma Traders"),
      row("j2", "JOB-2", null, null),
    ];
    // Distinct submission instants, so the order claim is at least expressible;
    // the oldest-first sort itself is the backend's contract (CAP-5).
    queueRows[0].submittedAt = "2026-11-12T05:30:00Z";
    queueRows[1].submittedAt = "2026-11-13T05:30:00Z";
    renderQueue();
    await screen.findByText(/JOB-1/);
    const items = await screen.findAllByRole("listitem");
    expect(items[0]?.textContent).toContain("JOB-1");
    expect(items[1]?.textContent).toContain("JOB-2");
    expect(screen.getByText(/Sharma Traders/)).toBeInTheDocument();
    expect(screen.getByText(/no name/)).toBeInTheDocument();
    expect(screen.getAllByText(/waiting 26 h/).length).toBe(2);
    // More pages exist beyond these two rows.
    expect(screen.getByText("2+")).toBeInTheDocument();
  });

  it("sends the filters and the cursor as query parameters, not just the URL", async () => {
    renderQueue("/admin/company/approvals?employeeId=e-gone&olderThan=24&cursor=c-x");
    await screen.findByText(/JOB-1/);
    const call = sentRequests().find(
      (r) => r.url.includes("/approval-queue") && !r.url.includes("/mine"),
    );
    const query = new URL(call?.url ?? "").searchParams;
    expect(query.get("employeeId")).toBe("e-gone");
    expect(query.get("olderThanHours")).toBe("24");
    expect(query.get("cursor")).toBe("c-x");
    // A malformed age filter reads as "any age" on the wire.
    renderQueue("/admin/company/approvals?olderThan=abc");
    await screen.findByText(/JOB-1/);
    const unfiltered = sentRequests().filter(
      (r) => r.url.includes("/approval-queue") && !r.url.includes("/mine"),
    );
    const last = new URL(unfiltered[unfiltered.length - 1]?.url ?? "").searchParams;
    expect(last.get("olderThanHours")).toBeNull();
  });

  it("stops paging at the exhausted queue — no dead link", async () => {
    queueExhausted = true;
    renderQueue("/admin/company/approvals?cursor=c-x");
    await screen.findByText(/JOB-1/);
    expect(screen.queryByRole("link", { name: "Older submissions" })).toBeNull();
  });

  it("shows the empty line, naming the filters, when nothing matches", async () => {
    queueRows = [];
    renderQueue("/admin/company/approvals?olderThan=24");
    await screen.findByText(/Nothing is waiting for approval for these filters/);
  });

  it("shows the plain empty line when no filter is set either", async () => {
    queueRows = [];
    renderQueue();
    await screen.findByText("Nothing is waiting for approval.");
  });

  it("keeps a hand-set employeeId selectable and clearable when the list lacks it", async () => {
    renderQueue("/admin/company/approvals?employeeId=e-gone");
    await screen.findByText(/JOB-1/);
    const ghost = document.querySelector('select option[value="e-gone"]');
    expect(ghost?.textContent).toBe("(this employee)");
  });

  it("says the filter failed but the address still applies", async () => {
    membersFail = true;
    renderQueue("/admin/company/approvals?employeeId=e-gone");
    await screen.findByText(/JOB-1/);
    expect(
      screen.getByText(
        /The employee filter could not load\. The employee filter already in the address still applies\./,
      ),
    ).toBeInTheDocument();
  });

  it("points the older page at the next cursor with the filters kept", async () => {
    renderQueue("/admin/company/approvals?employeeId=e-gone&olderThan=24");
    await screen.findByText(/JOB-1/);
    const link = screen.getByRole("link", { name: "Older submissions" });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("employeeId=e-gone");
    expect(href).toContain("olderThan=24");
    expect(href).toContain("cursor=c-next");
  });
});

describe("AdminApprovalQueuePage: decisions", () => {
  it("approves the clicked row's job at its exact endpoint, with no reason", async () => {
    renderQueue();
    await screen.findByText(/JOB-1/);
    fireEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]);
    await waitFor(() =>
      expect(sentRequests().some((r) => r.method === "POST" && r.url.includes("/approval"))).toBe(
        true,
      ),
    );
    const post = sentRequests().find((r) => r.method === "POST" && r.url.includes("/approval"));
    // Exact URL and exact body: a typo'd endpoint that merely still contains
    // "/jobs/" and "/approval", or a stray reason on the approve, must fail.
    expect(post?.url).toBe("https://api.test.example/api/v1/jobs/j1/approval");
    expect(post?.body).toEqual({ decision: "approve" });
    expect(post?.headers.get("Authorization")).toBe("Bearer tok-1");
  });

  it("rejects with the reason the owner typed, and omits it when blank", async () => {
    renderQueue();
    await screen.findByText(/JOB-1/);
    const firstRow = screen.getByText(/JOB-1/).closest("li") as HTMLElement;
    fireEvent.click(within(firstRow).getByRole("button", { name: "Reject" }));
    const dialog = firstRow.querySelector("dialog");
    expect(dialog?.open).toBe(true);
    fireEvent.change(within(dialog as HTMLElement).getByLabelText("Reason (optional)"), {
      target: { value: "Customer cancelled" },
    });
    fireEvent.click(within(dialog as HTMLElement).getByRole("button", { name: "Reject job" }));
    await waitFor(() =>
      expect(sentRequests().some((r) => r.method === "POST" && r.url.includes("/approval"))).toBe(
        true,
      ),
    );
    const post = sentRequests().find((r) => r.method === "POST" && r.url.includes("/approval"));
    expect(post?.url).toBe("https://api.test.example/api/v1/jobs/j1/approval");
    expect(post?.body).toEqual({ decision: "reject", reason: "Customer cancelled" });
  });

  it("omits the reason entirely when the owner declines without one", async () => {
    renderQueue();
    await screen.findByText(/JOB-1/);
    const firstRow = screen.getByText(/JOB-1/).closest("li") as HTMLElement;
    fireEvent.click(within(firstRow).getByRole("button", { name: "Reject" }));
    const dialog = firstRow.querySelector("dialog") as HTMLDialogElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject job" }));
    await waitFor(() =>
      expect(sentRequests().some((r) => r.method === "POST" && r.url.includes("/approval"))).toBe(
        true,
      ),
    );
    const post = sentRequests().find((r) => r.method === "POST" && r.url.includes("/approval"));
    expect(post?.body).toEqual({ decision: "reject" });
  });

  it("keeps the reject dialog open with the error inside it on a 409", async () => {
    conflictOnPost = true;
    renderQueue();
    await screen.findByText(/JOB-1/);
    const firstRow = screen.getByText(/JOB-1/).closest("li") as HTMLElement;
    fireEvent.click(within(firstRow).getByRole("button", { name: "Reject" }));
    const dialog = firstRow.querySelector("dialog") as HTMLDialogElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject job" }));
    // Never hidden behind the overlay: the dialog stays open with the news.
    expect(await within(dialog).findByText(/That job was already decided/)).toBeInTheDocument();
    expect(dialog.open).toBe(true);
  });

  it("shows a decided-elsewhere 409 beside the row that carried it", async () => {
    renderQueue();
    await screen.findByText(/JOB-1/);
    // The queue still holds the row (nobody else's fetch has removed it), so
    // the 409 belongs beside that row — not at page level and not only inside
    // the row's hidden reject dialog, which reads the same action result.
    conflictOnPost = true;
    fireEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]);
    await screen.findAllByText(/That job was already decided/);
    const rowEl = screen.getByText(/JOB-1/).closest("li");
    expect(rowEl).not.toBeNull();
    // The row's own alert (its hidden reject dialog also repeats the action
    // error — both read the same action result).
    expect(
      within(rowEl as HTMLElement).getAllByText(/That job was already decided/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("moves the news to page level when the row has left the list", async () => {
    renderQueue();
    await screen.findByText(/JOB-1/);
    // The job was decided by someone else while the page sat open: the queue
    // refetches without it, and the 409 must not flash on a stranger's row.
    conflictOnPost = true;
    queueDropsJ1 = true;
    fireEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]);
    const alerts = await screen.findAllByText(
      "That job was already decided. The list has been refreshed.",
    );
    expect(alerts.length).toBe(1);
  });
});

describe("AdminApprovalQueuePage: the edit form", () => {
  it("marks the row being edited and opens its form from ?edit=", async () => {
    editDetail = editJob();
    renderQueue("/admin/company/approvals?edit=j1");
    await screen.findByText(/Edit JOB-1/);
    expect(screen.getAllByText(/being edited/).length).toBe(1);
  });

  it("refuses a full form for a job that is no longer pending", async () => {
    editDetail = editJob("approved");
    renderQueue("/admin/company/approvals?edit=j1");
    expect(
      await screen.findByText(/That job is no longer waiting for approval/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Edit JOB-1/)).toBeNull();
  });

  it("shows a retry line, not a form, when the job fails to load", async () => {
    renderQueue("/admin/company/approvals?edit=j1");
    expect(await screen.findByText(/That job could not load for editing/)).toBeInTheDocument();
  });

  it("keeps the job's own pickers selectable when their lists failed", async () => {
    editDetail = editJob();
    skillsFail = true;
    customersFail = true;
    renderQueue("/admin/company/approvals?edit=j1");
    await screen.findByText(/Edit JOB-1/);
    expect(
      screen.getByText(/The skill list could not load — the job keeps its current skill/),
    ).toBeInTheDocument();
    const skillOption = document.querySelector(
      'select[name="skillId"] option[value="s-cur"]',
    ) as HTMLOptionElement;
    expect(skillOption.textContent).toBe("Current skill");
    const customer = document.querySelector('select[name="customerId"]') as HTMLSelectElement;
    expect(customer.options[0]?.value).toBe("c-cur");
    // The assignee the list cannot resolve stays selectable too.
    const technician = document.querySelector(
      'select[name="technicianId"] option[value="t-cur"]',
    ) as HTMLOptionElement;
    expect(technician.textContent).toBe("Current hand");
    // An untouched save keeps every field — exact body: nothing silently
    // cleared, no stray keys.
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(sentRequests().some((r) => r.method === "PATCH" && r.url.includes("/jobs/j1"))).toBe(
        true,
      ),
    );
    const patch = sentRequests().find((r) => r.method === "PATCH" && r.url.includes("/jobs/j1"));
    expect(patch?.url).toBe("https://api.test.example/api/v1/jobs/j1");
    expect(patch?.body).toEqual({
      description: "Fan repair",
      scheduledStart: "2026-11-15T05:00:00.000Z",
      scheduledEnd: null,
      notesForTechnician: null,
      technicianId: "t-cur",
      priority: "normal",
      serviceLocation: "Andheri West",
      skillId: "s-cur",
      customerId: "c-cur",
    });
  });

  it("carries the owner's changed fields in the save", async () => {
    editDetail = editJob();
    renderQueue("/admin/company/approvals?edit=j1");
    await screen.findByText(/Edit JOB-1/);
    fireEvent.change(screen.getByLabelText("What needs doing"), {
      target: { value: "Rewritten brief" },
    });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "urgent" } });
    fireEvent.change(screen.getByLabelText("Where"), { target: { value: "Bandra East" } });
    fireEvent.change(screen.getByLabelText("Notes for the employee (optional)"), {
      target: { value: "Call before arriving" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(sentRequests().some((r) => r.method === "PATCH" && r.url.includes("/jobs/j1"))).toBe(
        true,
      ),
    );
    const patch = sentRequests().find((r) => r.method === "PATCH" && r.url.includes("/jobs/j1"));
    expect(patch?.body).toMatchObject({
      description: "Rewritten brief",
      priority: "urgent",
      serviceLocation: "Bandra East",
      notesForTechnician: "Call before arriving",
    });
  });

  it("refuses an end time before the start without sending the save", async () => {
    editDetail = editJob();
    renderQueue("/admin/company/approvals?edit=j1");
    await screen.findByText(/Edit JOB-1/);
    fireEvent.change(screen.getByLabelText("Ends (optional)"), {
      target: { value: "2026-11-15T04:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    // The action's refusal also repeats inside the row's hidden reject dialog.
    expect(
      (await screen.findAllByText("The end time must come after the start time.")).length,
    ).toBeGreaterThanOrEqual(1);
    expect(sentRequests().filter((r) => r.method === "PATCH")).toHaveLength(0);
  });

  it("reports a decided-mid-edit 409 inside the form", async () => {
    editDetail = editJob();
    patchConflicts = true;
    renderQueue("/admin/company/approvals?edit=j1");
    await screen.findByText(/Edit JOB-1/);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      (await screen.findAllByText(/That job can no longer be edited/)).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("sends a real time conversion and reports the save", async () => {
    editDetail = editJob();
    renderQueue("/admin/company/approvals?edit=j1");
    await screen.findByText(/Edit JOB-1/);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(sentRequests().some((r) => r.method === "PATCH" && r.url.includes("/jobs/j1"))).toBe(
        true,
      ),
    );
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    const patch = sentRequests().find((r) => r.method === "PATCH" && r.url.includes("/jobs/j1"));
    const body = patch?.body as Record<string, unknown>;
    expect(body.scheduledStart).toBe("2026-11-15T05:00:00.000Z");
  });
});
