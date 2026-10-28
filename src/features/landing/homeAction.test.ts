import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "bun:test";
import type { ActionFunctionArgs } from "react-router";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../../testing/fetchMock";
import { homeAction } from "./homeAction";

// The home route serves two forms. A wrong intent would send an early-access sign-up
// as a call-back request, or the reverse, so each intent is checked against the endpoint it reaches.

function homeRequest(fields: Record<string, string>): ActionFunctionArgs {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  const request = new Request("http://localhost/", { method: "POST", body });
  return { request, params: {} } as unknown as ActionFunctionArgs;
}

beforeAll(() => useApiBase());
afterAll(() => clearApiBase());

beforeEach(() => {
  installFetchMock();
  setRespond(() => jsonResponse({ message: "Thanks." }, 202));
});

afterEach(() => restoreFetchMock());

describe("homeAction", () => {
  it("sends a form marked call-back to the contact-requests endpoint", async () => {
    await homeAction(homeRequest({ intent: "call-back", email: "ravi@example.com" }));

    const [sent] = sentRequests();
    expect(sent.url).toMatch(/\/api\/v1\/contact-requests$/);
    expect(sent.body).toEqual({ kind: "call_back", email: "ravi@example.com" });
  });

  it("sends a form with no intent to the early-access endpoint, not the call-back one", async () => {
    await homeAction(homeRequest({ email: "ravi@example.com" }));

    const [sent] = sentRequests();
    expect(sent.url).toMatch(/\/api\/v1\/early-access$/);
    expect(sent.body).not.toMatchObject({ kind: "call_back" });
  });

  it("leaves the request body readable for the chosen action", async () => {
    // The route reads the form once to pick the action, then the action reads it again.
    const args = homeRequest({ intent: "call-back", phone: "9876543210", dialCode: "+91" });
    await homeAction(args);

    expect(sentRequests()[0].body).toEqual({ kind: "call_back", phone: "+919876543210" });
  });
});
