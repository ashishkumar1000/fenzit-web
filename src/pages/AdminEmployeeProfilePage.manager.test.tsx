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

// The member record's Reporting-manager editor (Epic 24, CAP-6): the chain and
// headcount in the header, the picker's exclusions, the explicit re-parent
// confirmation, the clear path, the inactive current manager, the mapped
// refusals, the roster retry, and no double submit.

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const BOSS_ID = "33333333-3333-4333-8333-333333333333";
const SUB_ID = "44444444-4444-4444-8444-444444444444";
const DEEP_ID = "55555555-5555-4555-8555-555555555555";
const VIEWER_ID = "66666666-6666-4666-8666-666666666666";
const GONE_ID = "77777777-7777-4777-8777-777777777777";

const OWNER = {
  id: OWNER_ID,
  role: "company_admin",
  name: "Ravi Kumar",
  platformAdmin: false,
  email: null,
  countryCode: "+91",
  phoneNumber: "9900000001",
  employeeCode: "EMP-001",
  status: "active",
};

type Person = {
  userId: string;
  name: string;
  role: string;
  status: string;
  managerId: string | null;
  managerName: string | null;
  chain: Array<{ userId: string; name: string }>;
  headcount: number;
  directReports: number;
};

function person(overrides: Partial<Person> & Pick<Person, "userId" | "name">): Person {
  return {
    role: "employee",
    status: "active",
    managerId: null,
    managerName: null,
    chain: [],
    headcount: 0,
    directReports: 0,
    ...overrides,
  };
}

function baseRoster(): Person[] {
  return [
    person({ userId: OWNER_ID, name: "Ravi Kumar", role: "company_admin" }),
    person({
      userId: MEMBER_ID,
      name: "Asha V",
      managerId: BOSS_ID,
      chain: [{ userId: BOSS_ID, name: "Sanjay Menon" }],
      headcount: 2,
      directReports: 2,
    }),
    person({ userId: BOSS_ID, name: "Sanjay Menon" }),
    person({
      userId: SUB_ID,
      name: "Meena Joshi",
      chain: [
        { userId: MEMBER_ID, name: "Asha V" },
        { userId: BOSS_ID, name: "Sanjay Menon" },
      ],
    }),
    person({
      userId: DEEP_ID,
      name: "Kiran Das",
      chain: [
        { userId: SUB_ID, name: "Meena Joshi" },
        { userId: MEMBER_ID, name: "Asha V" },
      ],
    }),
    person({ userId: VIEWER_ID, name: "Vikas T", role: "viewer" }),
    person({ userId: GONE_ID, name: "Gone Person", status: "deactivated" }),
  ];
}

const state: {
  roster: Person[];
  member: Person;
  patchFailCode: string | null;
  deferPatch: (() => void) | null;
} = {
  roster: [],
  member: person({ userId: MEMBER_ID, name: "Asha V" }),
  patchFailCode: null,
  deferPatch: null,
};

function memberView(): Record<string, unknown> {
  return {
    ...state.member,
    email: "asha@example.com",
    countryCode: "+91",
    phoneNumber: "9800000002",
    employeeCode: "EMP-002",
    createdAt: "2026-01-01T00:00:00Z",
    avatarUrl: null,
    canCreateJobs: true,
    jobApprovalRequired: true,
    skills: [],
  };
}

function respond(url: string): Response | Promise<Response> {
  const parsed = new URL(url, "http://localhost");
  const path = parsed.pathname;
  if (path.endsWith("/users/me")) return jsonResponse(OWNER);
  if (path.endsWith(`/members/${MEMBER_ID}/manager`)) {
    const patch = sentRequests().find((request) => request.method === "PATCH");
    const body = patch?.body as { managerId: string | null } | undefined;
    if (state.patchFailCode !== null) {
      return jsonResponse({ error_code: state.patchFailCode, message: "developer text" }, 409);
    }
    const answer = () => {
      const manager = state.roster.find((p) => p.userId === body?.managerId) ?? null;
      state.member = {
        ...state.member,
        managerId: manager?.userId ?? null,
        chain: manager ? [{ userId: manager.userId, name: manager.name }] : [],
      };
      return jsonResponse(memberView());
    };
    if (state.deferPatch !== null) {
      return new Promise<Response>((resolve) => {
        state.deferPatch = () => resolve(answer());
      });
    }
    return answer();
  }
  if (path.endsWith(`/members/${MEMBER_ID}/employment`)) return jsonResponse({});
  if (path.endsWith(`/members/${MEMBER_ID}`)) return jsonResponse(memberView());
  if (path.endsWith("/members")) return jsonResponse(state.roster);
  if (path.endsWith("/attendance/leave/summary"))
    return jsonResponse({
      totals: { pending: 0, approved: 0, revoked: 0, cancelled: 0, rejected: 0 },
      activeEmployees: 10,
      counts: { pending: 0, approved: 0, revoked: 0, cancelled: 0, rejected: 0 },
    });
  return jsonResponse({ error_code: "RESOURCE_NOT_FOUND", message: "not mocked" }, 404);
}

function renderProfile(): void {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, {
    initialEntries: [`/admin/company/employees/${MEMBER_ID}`],
  });
  render(<RouterProvider router={router} />);
}

function openDialog(): HTMLDialogElement {
  fireEvent.click(screen.getByRole("button", { name: "Change" }));
  return document.querySelector("dialog[open]") as HTMLDialogElement;
}

beforeAll(() => useApiBase());
afterAll(() => clearApiBase());
beforeEach(() => {
  installFetchMock();
  state.roster = baseRoster();
  state.member = {
    ...state.roster.find((p) => p.userId === MEMBER_ID)!,
  };
  state.patchFailCode = null;
  state.deferPatch = null;
  setRespond(respond);
});
afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  cleanup();
});

describe("Employee profile: the Reporting block", () => {
  it("shows the chain, the headcount and the one Change control", async () => {
    renderProfile();
    await screen.findByText("Reports to");
    expect(screen.getByText("Sanjay Menon")).toBeInTheDocument();
    expect(screen.getByText("2 people report to them")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });

  it("puts an admin at the top with no Change control", async () => {
    state.member = person({ userId: MEMBER_ID, name: "Asha V", role: "company_admin" });
    renderProfile();
    await screen.findByText("Admins sit at the top of the team.");
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
  });

  it("says why editing is unavailable when the roster read fails, and retries it", async () => {
    setRespond((url) => {
      const path = new URL(url, "http://localhost").pathname;
      if (path.endsWith("/members")) {
        return jsonResponse({ error_code: "INTERNAL_SERVER_ERROR", message: "boom" }, 500);
      }
      return respond(url);
    });
    renderProfile();
    await screen.findByText("Reporting manager can't be changed until your team loads.");
    const before = sentRequests().filter((r) =>
      new URL(r.url).pathname.endsWith("/members"),
    ).length;
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    await waitFor(() =>
      expect(
        sentRequests().filter((r) => new URL(r.url).pathname.endsWith("/members")).length,
      ).toBe(before + 1),
    );
  });
});

describe("Employee profile: the Reporting-manager dialog", () => {
  it("excludes the member and their subtree, and warns about a viewer", async () => {
    renderProfile();
    await screen.findByText("Reports to");
    const dialog = openDialog();
    expect(within(dialog).queryByLabelText(/Asha V/)).toBeNull();
    expect(within(dialog).queryByLabelText(/Meena Joshi/)).toBeNull();
    expect(within(dialog).queryByLabelText(/Kiran Das/)).toBeNull();
    fireEvent.click(within(dialog).getByLabelText(/Vikas T/));
    expect(
      within(dialog).getByText(
        "Viewers can't normally see leave or job requests. As a reporting manager, they will see their team's and can decide them.",
      ),
    ).toBeInTheDocument();
  });

  it("confirms the re-parent, allows backing out, then sends the pick", async () => {
    renderProfile();
    await screen.findByText("Reports to");
    const dialog = openDialog();
    fireEvent.click(within(dialog).getByLabelText(/Ravi Kumar/));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(
      within(dialog).getByText("Asha's 2 direct reports will now report to you."),
    ).toBeInTheDocument();
    // Nothing posts before Confirm.
    expect(sentRequests().some((r) => r.method === "PATCH")).toBe(false);
    // Back returns to the picker, and still nothing posts.
    fireEvent.click(within(dialog).getByRole("button", { name: "Back" }));
    expect(within(dialog).getByText("Choose a reporting manager")).toBeInTheDocument();
    expect(sentRequests().some((r) => r.method === "PATCH")).toBe(false);
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    // Focus lands on the decision, not on the page behind the dialog.
    const confirm = within(dialog).getByRole("button", { name: "Confirm" });
    expect(document.activeElement).toBe(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(sentRequests().some((r) => r.method === "PATCH")).toBe(true));
    expect(sentRequests().find((r) => r.method === "PATCH")?.body).toEqual({
      managerId: OWNER_ID,
    });
    expect(await within(dialog).findByText("Reporting manager updated.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    // The route revalidated: the header reads the manager that was saved.
    // The "(Owner)" mark is its own span for the quieter colour, so match on
    // the line's full text rather than one text node.
    expect(
      await screen.findByText((_, element) => element?.textContent === "Ravi Kumar (Owner)"),
    ).toBeInTheDocument();
  });

  it("sends the owner default as an explicit null, and says the team moves", async () => {
    renderProfile();
    await screen.findByText("Reports to");
    const dialog = openDialog();
    // Story 24-8: the no-manager choice is gone; the owner is the default.
    fireEvent.click(within(dialog).getByLabelText(/The company owner/));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(
      within(dialog).getByText("Asha's 2 direct reports will now report to the company owner."),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(sentRequests().some((r) => r.method === "PATCH")).toBe(true));
    // Null on the wire is the default request: the server resolves the owner.
    expect(sentRequests().find((r) => r.method === "PATCH")?.body).toEqual({ managerId: null });
  });

  it("keeps the dialog open with the mapped refusal and the old value", async () => {
    state.patchFailCode = "HIERARCHY_CYCLE";
    renderProfile();
    await screen.findByText("Reports to");
    const dialog = openDialog();
    fireEvent.click(within(dialog).getByLabelText(/Ravi Kumar/));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    expect(
      await within(dialog).findByText(
        "That person already reports to this person, directly or through someone else.",
      ),
    ).toBeInTheDocument();
    expect(dialog.open).toBe(true);
    // The header still reads the stored manager, never the refused pick.
    expect(screen.getByText("Sanjay Menon")).toBeInTheDocument();
  });

  it("keeps an inactive current manager selected and refuses a no-op save", async () => {
    state.member = {
      ...state.member,
      managerId: GONE_ID,
      managerName: "Gone Person",
      chain: [{ userId: GONE_ID, name: "Gone Person" }],
    };
    renderProfile();
    await screen.findByText("Reports to");
    const dialog = openDialog();
    const stale = within(dialog).getByLabelText(/Gone Person/);
    expect(stale).toBeChecked();
    // The stored pointer is shown, not offered — and nothing can overwrite it.
    expect(stale).toBeDisabled();
    expect(
      within(dialog).getByText("No longer active. Pick someone else to change this."),
    ).toBeInTheDocument();
    // A no-op save is refused here: the server checks the manager's live state
    // before it returns early, so an unchanged PATCH would answer
    // MANAGER_NOT_ACTIVE for doing nothing.
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
    expect(sentRequests().some((r) => r.method === "PATCH")).toBe(false);
  });

  it("cannot double-post while the save is in flight", async () => {
    renderProfile();
    await screen.findByText("Reports to");
    const dialog = openDialog();
    state.deferPatch = () => {};
    fireEvent.click(within(dialog).getByLabelText(/Ravi Kumar/));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    const confirm = within(dialog).getByRole("button", { name: "Confirm" });
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: /Saving…/ })).toBeDisabled(),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /Saving…/ }));
    expect(sentRequests().filter((r) => r.method === "PATCH")).toHaveLength(1);
    state.deferPatch?.();
    state.deferPatch = null;
    // Let the held response land, so the router's update is inside the test.
    await within(dialog).findByText("Reporting manager updated.");
  });
});
