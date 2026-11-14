import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// The employee's create-job page (Epic 22, CAP-2): the refusal is the page,
// not a disabled form; the idempotency key survives a failed attempt so a
// lost response cannot mint a second job; local validation answers before
// any request leaves; and the outcome copy follows the backend's routing.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

const KEY_STORE = "fenzit.newjob.idempotencyKey";
let jobPosts: number;
let failFirstPost: boolean;

beforeEach(() => {
  jobPosts = 0;
  failFirstPost = false;
  installFetchMock();
  setRespond(respondDefault);
});

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  window.sessionStorage.clear();
  cleanup();
});

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    return jsonResponse({
      id: "u-emp",
      role: "employee",
      name: "Priya Nair",
      platformAdmin: false,
      email: null,
      countryCode: "+91",
      phoneNumber: "9876543210",
      employeeCode: "E-12",
      status: "active",
      canCreateJobs: state.canCreateJobs,
      jobApprovalRequired: true,
    });
  }
  if (url.endsWith("/skills")) {
    return jsonResponse({
      skills: [
        { id: "s1", name: "AC service" },
        { id: "s2", name: "Plumbing" },
      ],
    });
  }
  if (url.includes("/customers")) {
    return jsonResponse({ data: [{ id: "c1", name: "Sharma Traders" }], nextCursor: null });
  }
  if (url.endsWith("/jobs")) {
    jobPosts += 1;
    if (failFirstPost && jobPosts === 1) return jsonResponse({}, 500);
    return jsonResponse({ id: "j9", jobNumber: "JOB-33", status: state.createdStatus }, 201);
  }
  throw new TypeError(`offline in tests: ${url}`);
}

let state: { canCreateJobs: boolean; createdStatus: string };

function defaultState(): void {
  state = { canCreateJobs: true, createdStatus: "pending_approval" };
}

function renderNewJob(entry = "/admin/me/new-job"): void {
  writeSession({ token: "tok-1", name: "Priya" });
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
}

function fillRequiredFields(): void {
  fireEvent.change(screen.getByLabelText("What needs doing"), { target: { value: "Fan repair" } });
  fireEvent.change(screen.getByLabelText("What needs doing (skill)"), {
    target: { value: "s1" },
  });
  fireEvent.change(screen.getByLabelText("Starts"), { target: { value: "2026-11-15T10:00" } });
  fireEvent.change(screen.getByLabelText("Where"), { target: { value: "Andheri West" } });
}

function selectCustomer(id: string): void {
  fireEvent.change(screen.getByLabelText("Customer"), { target: { value: id } });
}

async function submit(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: /Create job/ }));
}

describe("AdminMeNewJobPage: the refusal is the page (CAP-2)", () => {
  it("refuses a caller whose create switch is off — no form, no key minted", async () => {
    defaultState();
    state.canCreateJobs = false;
    renderNewJob();
    expect(
      await screen.findByText(
        "You are not allowed to create jobs. Ask your owner to turn this on for you.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("What needs doing")).toBeNull();
    expect(window.sessionStorage.getItem(KEY_STORE)).toBeNull();
  });

  it("shows a retry card, not a crash, when the loader fails", async () => {
    defaultState();
    // The layout's own check must succeed, then the child loader's call fails —
    // the page keeps its own retry, not the router's error screen.
    let meCalls = 0;
    setRespond((url) => {
      if (url.endsWith("/users/me")) {
        meCalls += 1;
        return meCalls === 1 ? respondDefault(url) : jsonResponse({}, 500);
      }
      return respondDefault(url);
    });
    renderNewJob();
    expect(await screen.findByText(/The new-job form could not load/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("AdminMeNewJobPage: the idempotency key (CAP-2)", () => {
  it("mints the key once and carries it in the hidden field", async () => {
    defaultState();
    renderNewJob();
    await screen.findByLabelText("What needs doing");
    const key = window.sessionStorage.getItem(KEY_STORE);
    expect(key).not.toBeNull();
    const hidden = document.querySelector('input[name="idempotencyKey"]') as HTMLInputElement;
    expect(hidden.value).toBe(key as string);
  });
});

describe("AdminMeNewJobPage: local validation answers before any request", () => {
  it("holds the Create button while a picker list failed to load", async () => {
    defaultState();
    setRespond((url) => (url.endsWith("/skills") ? jsonResponse({}, 500) : respondDefault(url)));
    renderNewJob();
    await screen.findByText(/The skill list could not load/);
    const create = screen.getByRole("button", { name: /Create job/ }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    expect(
      screen.getByText(/The Create button is held until the lists above load/),
    ).toBeInTheDocument();
    fireEvent.click(create);
    expect(sentRequests().filter((r) => r.method === "POST")).toHaveLength(0);
  });

  it("holds Create for a failed customer list too, and releases it for a new customer", async () => {
    defaultState();
    setRespond((url) => (url.includes("/customers") ? jsonResponse({}, 500) : respondDefault(url)));
    renderNewJob();
    await screen.findByText(/The customer list could not load/);
    const create = screen.getByRole("button", { name: /Create job/ }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    // A brand-new customer needs no picker — the button must come back.
    fireEvent.change(screen.getByLabelText("Who is it for"), { target: { value: "new" } });
    fireEvent.change(screen.getByLabelText("Customer name"), {
      target: { value: "Mehta Foods" },
    });
    fireEvent.change(screen.getByLabelText(/Phone number/), {
      target: { value: "9876543210" },
    });
    fireEvent.change(screen.getByLabelText("Address (optional)"), {
      target: { value: "MG Road" },
    });
    fillRequiredFields();
    expect(create.disabled).toBe(false);
    await submit();
    await screen.findByText(/created — waiting for your owner's approval/);
    const post = sentRequests().find((r) => r.method === "POST" && r.url.endsWith("/jobs"));
    // Whitespace leaves the phone before it reaches the wire; the address
    // rides along; no customerId may appear for a new customer.
    expect(post?.body).toMatchObject({
      newCustomer: {
        name: "Mehta Foods",
        countryCode: "+91",
        phoneNumber: "9876543210",
        address: "MG Road",
      },
    });
    expect(post?.body).not.toHaveProperty("customerId");
  });

  it("refuses an end time before the start without sending anything", async () => {
    defaultState();
    renderNewJob();
    await screen.findByLabelText("What needs doing");
    fillRequiredFields();
    selectCustomer("c1");
    fireEvent.change(screen.getByLabelText("Ends (optional)"), {
      target: { value: "2026-11-15T09:00" },
    });
    await submit();
    expect(
      await screen.findByText("The end time must come after the start time."),
    ).toBeInTheDocument();
    expect(sentRequests().filter((r) => r.method === "POST")).toHaveLength(0);
  });

  it("refuses an end time exactly equal to the start too", async () => {
    defaultState();
    renderNewJob();
    await screen.findByLabelText("What needs doing");
    fillRequiredFields();
    selectCustomer("c1");
    fireEvent.change(screen.getByLabelText("Ends (optional)"), {
      target: { value: "2026-11-15T10:00" },
    });
    await submit();
    expect(
      await screen.findByText("The end time must come after the start time."),
    ).toBeInTheDocument();
    expect(sentRequests().filter((r) => r.method === "POST")).toHaveLength(0);
  });

  it("strips the spaces a pasted phone may carry before it reaches the wire", async () => {
    // The browser pattern blocks spaced numbers on the click path; a direct
    // submit exercises the action's own normalisation, which must hold too.
    defaultState();
    renderNewJob();
    await screen.findByLabelText("What needs doing");
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Who is it for"), { target: { value: "new" } });
    fireEvent.change(screen.getByLabelText("Customer name"), {
      target: { value: "Mehta Foods" },
    });
    fireEvent.change(screen.getByLabelText(/Phone number/), {
      target: { value: " 9876543210 " },
    });
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    await screen.findByText(/created — waiting for your owner's approval/);
    const post = sentRequests().find((r) => r.method === "POST" && r.url.endsWith("/jobs"));
    expect(post?.body).toMatchObject({
      newCustomer: { name: "Mehta Foods", countryCode: "+91", phoneNumber: "9876543210" },
    });
  });

  it("mirrors the backend's blank-field refusals without sending anything", async () => {
    defaultState();
    renderNewJob();
    await screen.findByLabelText("What needs doing");
    // Each blank the browser's required attributes would normally catch must
    // also be refused by the action itself (programmatic submits).
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    expect(await screen.findByText("Describe the work first.")).toBeInTheDocument();
    expect(sentRequests().filter((r) => r.method === "POST")).toHaveLength(0);
  });

  it("refuses a new customer without a valid phone without sending anything", async () => {
    defaultState();
    renderNewJob();
    await screen.findByLabelText("What needs doing");
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Who is it for"), { target: { value: "new" } });
    fireEvent.change(screen.getByLabelText("Customer name"), {
      target: { value: "Mehta Foods" },
    });
    fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: "123" } });
    // A click would be stopped by the phone field's own pattern attribute (as
    // it should be); submitting the form directly exercises the action's
    // server-side-mirror guard, which must also hold.
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    expect(
      await screen.findByText("A new customer needs a name and a 6–15 digit phone number."),
    ).toBeInTheDocument();
    expect(sentRequests().filter((r) => r.method === "POST")).toHaveLength(0);
  });
});

describe("AdminMeNewJobPage: the create goes out with the caller as its technician", () => {
  it("posts the form for an existing customer and reports the waiting outcome", async () => {
    defaultState();
    renderNewJob();
    await screen.findByLabelText("What needs doing");
    fillRequiredFields();
    selectCustomer("c1");
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "urgent" } });
    const keyBefore = window.sessionStorage.getItem(KEY_STORE);
    await submit();
    await screen.findByText(/created — waiting for your owner's approval/);
    const post = sentRequests().find((r) => r.method === "POST" && r.url.endsWith("/jobs"));
    expect(post?.headers.get("x-idempotency-key")).toBe(keyBefore);
    expect(post?.body).toMatchObject({
      technicianId: "u-emp",
      description: "Fan repair",
      priority: "urgent",
      customerId: "c1",
      skillId: "s1",
      serviceLocation: "Andheri West",
    });
    // The local datetime-local value left as a real UTC instant, not a string.
    const body = post?.body as Record<string, unknown>;
    expect(String(body.scheduledStart).endsWith("Z")).toBe(true);
    expect(new Date(body.scheduledStart as string).getTime()).toBe(
      new Date("2026-11-15T10:00").getTime(),
    );
  });

  it("reports the assigned outcome when the backend does not hold the job", async () => {
    defaultState();
    state.createdStatus = "assigned";
    renderNewJob();
    await screen.findByLabelText("What needs doing");
    fillRequiredFields();
    selectCustomer("c1");
    await submit();
    expect(await screen.findByText(/created and assigned to you/)).toBeInTheDocument();
  });

  it("reuses the same key when the first attempt fails, and readies a new one on success", async () => {
    defaultState();
    failFirstPost = true;
    renderNewJob();
    await screen.findByLabelText("What needs doing");
    fillRequiredFields();
    const keyBefore = window.sessionStorage.getItem(KEY_STORE);
    selectCustomer("c1");
    await submit();
    expect(await screen.findByText(/Something went wrong on our side/)).toBeInTheDocument();
    // The failed attempt keeps its key — a retry replays, not mints.
    expect(window.sessionStorage.getItem(KEY_STORE)).toBe(keyBefore);
    await submit();
    await screen.findByText(/created — waiting for your owner's approval/);
    const posts = sentRequests().filter((r) => r.method === "POST" && r.url.endsWith("/jobs"));
    expect(posts.length).toBe(2);
    expect(posts[0]?.headers.get("x-idempotency-key")).toBe(
      posts[1]?.headers.get("x-idempotency-key"),
    );
    // The submission succeeded, so the next create must be a new submission —
    // the revalidated loader has minted a fresh key.
    await waitFor(() => {
      expect(window.sessionStorage.getItem(KEY_STORE)).not.toBe(keyBefore);
    });
  });
});
