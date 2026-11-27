import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { employeeProfileAction } from "./employeeProfileLoaders";
import { clearSession, writeSession } from "../../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../../testing/fetchMock";

// The profile route's reporting-manager intent (Epic 24, CAP-6): "" clears,
// an id assigns, an unknown id is a visible validation error, and every
// server refusal is mapped by `error_code` (never the developer message).

type ActionArgs = Parameters<typeof employeeProfileAction>[0];

function post(fields: Record<string, string>): ActionArgs {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  const request = new Request("http://localhost/admin/company/employees/u-a", {
    method: "POST",
    body: form,
  });
  return { request, params: { userId: "u-a" }, context: undefined } as unknown as ActionArgs;
}

const MGR = "11111111-1111-4111-8111-111111111111";

function owner(): Response {
  return jsonResponse({ id: "u-own", role: "company_admin", name: "Ravi", platformAdmin: false });
}

function viewer(): Response {
  return jsonResponse({ id: "u-v", role: "viewer", name: "Vikas", platformAdmin: false });
}

beforeAll(() => useApiBase());
afterAll(() => clearApiBase());
beforeEach(() => {
  installFetchMock();
  setRespond((url) => (url.endsWith("/users/me") ? owner() : jsonResponse({})));
  writeSession({ token: "tok-1", name: "Ravi" });
});
afterEach(() => {
  restoreFetchMock();
  clearSession();
  window.localStorage.clear();
});

describe("employeeProfileAction: the manager intent", () => {
  it("assigns the chosen manager with the shipped PATCH body", async () => {
    setRespond((url) => {
      if (url.endsWith("/users/me")) return owner();
      if (url.endsWith("/members/u-a/manager")) return jsonResponse({ userId: "u-a" });
      return jsonResponse({});
    });
    const result = await employeeProfileAction(post({ intent: "manager", managerId: MGR }));
    expect(result).toEqual({ kind: "manager", state: "done", userId: "u-a", managerId: MGR });
    const patch = sentRequests().find((r) => r.method === "PATCH");
    expect(patch?.url).toContain("/members/u-a/manager");
    expect(patch?.body).toEqual({ managerId: MGR });
  });

  it("clears with an explicit null, never by omitting the key", async () => {
    setRespond((url) => {
      if (url.endsWith("/users/me")) return owner();
      if (url.endsWith("/members/u-a/manager")) return jsonResponse({ userId: "u-a" });
      return jsonResponse({});
    });
    const result = await employeeProfileAction(post({ intent: "manager", managerId: "" }));
    expect(result).toMatchObject({ kind: "manager", state: "done", managerId: null });
    expect(sentRequests().find((r) => r.method === "PATCH")?.body).toEqual({ managerId: null });
  });

  it("refuses an id-shaped-free value without sending anything", async () => {
    const result = await employeeProfileAction(post({ intent: "manager", managerId: "not-an-id" }));
    expect(result).toEqual({
      kind: "manager",
      state: "error",
      message: "Please choose a reporting manager from the list.",
    });
    expect(sentRequests().some((r) => r.method === "PATCH")).toBe(false);
  });

  it.each([
    ["MEMBER_IS_ADMIN", "An owner sits at the top of the team and cannot report to anyone."],
    [
      "MANAGER_NOT_ACTIVE",
      "That person is not an active member of the company, so they cannot be a reporting manager.",
    ],
    [
      "HIERARCHY_CYCLE",
      "That person already reports to this person, directly or through someone else.",
    ],
    [
      "HIERARCHY_DEPTH",
      "That would make the team more than 20 levels deep. Pick a manager higher up.",
    ],
  ])("maps %s to a sentence a user can read", async (code, message) => {
    setRespond((url) => {
      if (url.endsWith("/users/me")) return owner();
      if (url.endsWith("/members/u-a/manager"))
        return jsonResponse({ error_code: code, message: "developer text" }, 409);
      return jsonResponse({});
    });
    const result = await employeeProfileAction(post({ intent: "manager", managerId: MGR }));
    expect(result).toEqual({ kind: "manager", state: "error", message });
  });

  it("sends nothing for a non-owner and lets the guard redirect", async () => {
    setRespond((url) => (url.endsWith("/users/me") ? viewer() : jsonResponse({})));
    writeSession({ token: "tok-v", name: "Vikas" });
    await expect(
      employeeProfileAction(post({ intent: "manager", managerId: MGR })),
    ).rejects.toBeInstanceOf(Response);
    expect(sentRequests().some((r) => r.method === "PATCH")).toBe(false);
  });

  it("keeps the activate intent's result kind distinct", async () => {
    setRespond((url) => {
      if (url.endsWith("/users/me")) return owner();
      if (url.endsWith("/members/u-a/active"))
        return jsonResponse({ userId: "u-a", status: "active" });
      return jsonResponse({});
    });
    const result = await employeeProfileAction(post({ intent: "activate", active: "true" }));
    expect(result).toEqual({ kind: "activate", state: "done", status: "active" });
  });
});
