import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { adminEmployeesAction } from "./adminBrowseLoaders";
import { installFetchMock, restoreFetchMock, sentRequests } from "../../testing/fetchMock";

// The employees action's intent is a server-side guard: an unknown or missing
// intent must never be written as a job-settings save, and must send nothing.

type ActionArgs = Parameters<typeof adminEmployeesAction>[0];

function post(fields: Record<string, string>): ActionArgs {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  const request = new Request("http://localhost/admin/company/employees", {
    method: "POST",
    body: form,
  });
  return { request, params: {}, context: undefined } as unknown as ActionArgs;
}

beforeEach(() => installFetchMock());
afterEach(() => restoreFetchMock());

describe("adminEmployeesAction: the invite's manager shape", () => {
  const invite = {
    intent: "invite",
    name: "Meera",
    countryCode: "+91",
    phoneNumber: "9812345678",
  };

  it("refuses a managerId that is not an id, visibly and without a request", async () => {
    const result = await adminEmployeesAction(post({ ...invite, managerId: "not-an-id" }));
    expect(result).toMatchObject({
      kind: "invite",
      state: "error",
      message: "Please choose a reporting manager from the list.",
    });
    // Never a silent drop: nothing left the browser with a mangled manager.
    expect(sentRequests()).toHaveLength(0);
  });
});

describe("adminEmployeesAction: the intent guard", () => {
  it.each([
    ["an unknown intent", { intent: "delete-everyone", userId: "u-b", canCreateJobs: "on" }],
    ["a missing intent", { userId: "u-b", canCreateJobs: "on" }],
    ["an empty intent", { intent: "", userId: "u-b", canCreateJobs: "on" }],
  ])("refuses %s and sends nothing", async (_label, fields) => {
    const result = await adminEmployeesAction(post(fields));
    expect(result).toMatchObject({ kind: "job-settings", state: "error", userId: "u-b" });
    expect(sentRequests()).toHaveLength(0);
  });
});
