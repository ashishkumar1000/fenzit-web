import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { writeSession } from "../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// One job's detail — the console's drill-down for both roles. The owner reads
// any job; an employee only one of their own (a stranger's job reads as "not
// available", never as an error). The workflow reads the job's real state: a
// finished job's steps are done, a rejected job names its reason even before
// the decision instant is known, and an expired photo link degrades to a
// tile, not a broken image.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

let detailStatus = 200;
let detailBody: Record<string, unknown> = {};

beforeEach(() => {
  detailStatus = 200;
  detailBody = detailFixture();
  installFetchMock();
  setRespond(respondDefault);
});

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  cleanup();
});

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    return jsonResponse(
      meRole === "owner"
        ? { id: "u-owner", role: "company_admin", name: "Ravi Kumar", platformAdmin: false }
        : { id: "u-emp", role: "employee", name: "Priya Nair", platformAdmin: false },
    );
  }
  if (/\/api\/v1\/jobs\/j\d+$/.test(url)) {
    return jsonResponse(detailBody, detailStatus);
  }
  if (url.includes("/job-reports/owner")) {
    // The owner layout's dashboard fetch — irrelevant here, degrade.
    return jsonResponse({}, 500);
  }
  throw new TypeError(`offline in tests: ${url}`);
}

let meRole: "owner" | "member" = "owner";

function detailFixture(): Record<string, unknown> {
  const step = (key: string, label: string) => ({
    key,
    label,
    requiresPhoto: false,
    requiresSignature: false,
    setsStatus: null,
  });
  return {
    id: "j1",
    jobNumber: "JB-2026-0001",
    status: "completed",
    priority: "normal",
    serviceLocation: "12 Nehru Road",
    scheduledStart: "2026-11-12T03:30:00Z",
    scheduledEnd: null,
    completedAt: "2026-11-12T09:00:00Z",
    description: "AC service",
    notesForTechnician: null,
    decidedAt: null,
    rejectionReason: null,
    createdAt: "2026-11-12T02:00:00Z",
    currentStep: null,
    currentStepIndex: null,
    skill: { id: "s1", name: "AC service" },
    technician: {
      id: "u-emp",
      name: "Priya Nair",
      countryCode: "+91",
      phoneNumber: "9876543210",
      skills: ["AC service"],
    },
    customer: {
      id: "c1",
      name: "Sharma Traders",
      countryCode: "+91",
      phoneNumber: "9876500000",
      address: null,
      formattedAddress: null,
    },
    activityLog: [
      {
        id: "log-1",
        eventType: "job_completed",
        actorName: "Priya Nair",
        createdAt: "2026-11-12T09:00:00Z",
      },
    ],
    attachments: [
      { id: "a1", type: "photo", url: "https://files.test/p1", createdAt: "2026-11-12T08:00:00Z" },
    ],
    workflowTemplate: {
      version: 3,
      steps: [step("arrived", "Arrived"), step("done", "Work done")],
    },
  };
}

function renderDetail(entry = "/admin/company/jobs/j1"): void {
  writeSession({ token: "tok-1", name: meRole === "owner" ? "Ravi" : "Priya" });
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
}

describe("AdminJobDetailPage: the facts and the workflow", () => {
  async function factsSection(): Promise<HTMLElement> {
    const heading = await screen.findByRole("heading", { name: "JB-2026-0001" });
    return heading.closest("section") as HTMLElement;
  }

  it("names the customer, the employee and the slot, and links back to the jobs", async () => {
    renderDetail();
    const facts = await factsSection();
    expect(within(facts).getByText(/Sharma Traders/)).toBeInTheDocument();
    expect(within(facts).getByText(/Priya Nair · \+91 98765 43210/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All jobs" })).toHaveAttribute(
      "href",
      "/admin/company/jobs",
    );
  });

  it("reads a finished job's every step as done, not as upcoming work", async () => {
    renderDetail();
    const workflow = (await screen.findByText("Work done")).closest("section") as HTMLElement;
    const steps = within(workflow).getAllByRole("listitem");
    for (const step of steps) expect(step.getAttribute("data-state")).toBe("done");
    expect(within(workflow).getAllByText(/· done/).length).toBe(2);
  });

  it("reads a running job's current step as current", async () => {
    detailBody = {
      ...detailFixture(),
      status: "in_progress",
      currentStepIndex: 0,
      completedAt: null,
    };
    renderDetail();
    const workflow = (await screen.findByText("Arrived")).closest("section") as HTMLElement;
    const steps = within(workflow).getAllByRole("listitem");
    expect(steps[0]?.getAttribute("data-state")).toBe("current");
    expect(steps[1]?.getAttribute("data-state")).toBe("upcoming");
  });

  it("names a rejected job's reason even before the decided instant is known", async () => {
    detailBody = {
      ...detailFixture(),
      status: "rejected",
      rejectionReason: "Wrong address",
      decidedAt: null,
      completedAt: null,
    };
    renderDetail();
    expect(await screen.findByText("Wrong address")).toBeInTheDocument();
    // No decision instant yet — the row must not imply one.
    expect(screen.queryByText(/decided /)).toBeNull();
  });
});

describe("AdminJobDetailPage: what the reader may see", () => {
  it("tells a member plainly when a job is not theirs", async () => {
    meRole = "member";
    detailStatus = 404;
    renderDetail();
    expect(
      await screen.findByText(
        "This job is not available to you. You can open only the jobs assigned to you.",
      ),
    ).toBeInTheDocument();
  });

  it("tells an owner the address may be wrong, not that they lack the job", async () => {
    meRole = "owner";
    detailStatus = 404;
    renderDetail();
    expect(
      await screen.findByText(
        "This job is not available. It may be mistyped, or outside your company.",
      ),
    ).toBeInTheDocument();
  });

  it("offers a retry, not a blank screen, when the job cannot load", async () => {
    detailStatus = 500;
    renderDetail();
    expect(await screen.findByText("The job could not load.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("AdminJobDetailPage: the attachments", () => {
  it("shows the unavailable tile for an attachment without a link", async () => {
    detailBody = {
      ...detailFixture(),
      attachments: [{ id: "a1", type: "signature", url: null, createdAt: "2026-11-12T08:00:00Z" }],
    };
    renderDetail();
    const shot = (await screen.findByText("Unavailable")).closest("li") as HTMLElement;
    // The tile still says what the attachment was and when it landed.
    expect(shot.textContent).toContain("Signature");
    expect(shot.textContent).toContain("12 Nov");
  });

  it("keeps a photo's own words as its description for the reader", async () => {
    renderDetail();
    const shot = await screen.findByAltText(/JB-2026-0001 photo from/);
    expect(shot.getAttribute("src")).toBe("https://files.test/p1");
  });
});
