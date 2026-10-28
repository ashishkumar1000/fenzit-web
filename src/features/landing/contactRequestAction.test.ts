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
import { callBackAction, demoAction, type ContactRequestResult } from "./contactRequestAction";

// Each test builds a form the way the browser would send it, then checks what the visitor
// sees and what (if anything) reaches the network. Invalid input must never reach fenzit-be.

type Fields = Record<string, string>;

const SAVED = "Thanks. We will be in touch to book your demo.";

function run(
  action: (args: ActionFunctionArgs) => Promise<ContactRequestResult>,
  fields: Fields,
): Promise<ContactRequestResult> {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  const request = new Request("http://localhost/", { method: "POST", body });
  return action({ request, params: {} } as unknown as ActionFunctionArgs);
}

beforeAll(() => useApiBase());
afterAll(() => clearApiBase());

beforeEach(() => {
  installFetchMock();
  setRespond(() => jsonResponse({ message: SAVED }, 202));
});

afterEach(() => restoreFetchMock());

describe("demoAction", () => {
  it("asks for a name before anything is sent", async () => {
    const result = await run(demoAction, { name: "   ", dialCode: "+91", phone: "9876543210" });

    expect(result).toEqual({
      ok: false,
      error: "Type your name so we know who to call.",
      field: "name",
    });
    expect(sentRequests()).toEqual([]);
  });

  it("refuses a request with neither email nor phone", async () => {
    const result = await run(demoAction, { name: "Ravi", dialCode: "+91", phone: "", email: "" });

    expect(result).toMatchObject({ ok: false, field: "contact" });
    expect(sentRequests()).toEqual([]);
  });

  it("refuses a phone number typed with a plus sign, 00 or a leading zero", async () => {
    for (const phone of ["+919876543210", "09876543210", "00919876543210"]) {
      const result = await run(demoAction, { name: "Ravi", dialCode: "+91", phone });
      expect(result).toMatchObject({ ok: false, field: "phone" });
    }
    expect(sentRequests()).toEqual([]);
  });

  it("accepts a name of exactly 120 characters and refuses 121", async () => {
    const atLimit = await run(demoAction, {
      name: "a".repeat(120),
      dialCode: "+91",
      phone: "9876543210",
    });
    expect(atLimit).toEqual({ ok: true, message: SAVED });

    const overLimit = await run(demoAction, {
      name: "a".repeat(121),
      dialCode: "+91",
      phone: "9876543210",
    });
    expect(overLimit).toMatchObject({ ok: false, field: "name" });
    expect(sentRequests()).toHaveLength(1);
  });

  it("refuses a note over 500 characters", async () => {
    const result = await run(demoAction, {
      name: "Ravi",
      dialCode: "+91",
      phone: "9876543210",
      note: "n".repeat(501),
    });

    expect(result).toMatchObject({ ok: false });
    expect(sentRequests()).toEqual([]);
  });

  it("refuses an email that does not look like one, and an email over 254 characters", async () => {
    const bad = await run(demoAction, { name: "Ravi", email: "ravi@" });
    expect(bad).toMatchObject({ ok: false, field: "email" });

    const long = await run(demoAction, { name: "Ravi", email: `${"a".repeat(250)}@x.co` });
    expect(long).toMatchObject({ ok: false, field: "email" });
    expect(sentRequests()).toEqual([]);
  });

  it("sends the phone in E.164 form, trims the name and lower-cases the email", async () => {
    const result = await run(demoAction, {
      name: "  Ravi  ",
      company: "",
      email: "Ravi@Example.COM",
      dialCode: "+91",
      phone: "98765 43210",
      note: "",
    });

    expect(result).toEqual({ ok: true, message: SAVED });
    const [sent] = sentRequests();
    expect(sent.url).toMatch(/\/api\/v1\/contact-requests$/);
    expect(sent.method).toBe("POST");
    expect(sent.body).toEqual({
      kind: "demo",
      name: "Ravi",
      email: "ravi@example.com",
      phone: "+919876543210",
    });
  });

  it("leaves blank optional fields out of the request body", async () => {
    await run(demoAction, { name: "Ravi", email: "ravi@example.com", phone: "", dialCode: "+91" });

    expect(sentRequests()[0].body).toEqual({
      kind: "demo",
      name: "Ravi",
      email: "ravi@example.com",
    });
  });

  it("shows a readable message when the network call fails, and does not throw", async () => {
    setRespond(() => {
      throw new TypeError("Failed to fetch");
    });

    const result = await run(demoAction, { name: "Ravi", dialCode: "+91", phone: "9876543210" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.length).toBeGreaterThan(0);
    expect(result.error).not.toContain("TypeError");
  });
});

describe("callBackAction", () => {
  it("does not require a name", async () => {
    const result = await run(callBackAction, { dialCode: "+91", phone: "9876543210" });

    expect(result.ok).toBe(true);
    expect(sentRequests()[0].body).toEqual({ kind: "call_back", phone: "+919876543210" });
  });

  it("accepts an email alone", async () => {
    const result = await run(callBackAction, { email: "ravi@example.com" });

    expect(result.ok).toBe(true);
    expect(sentRequests()[0].body).toEqual({ kind: "call_back", email: "ravi@example.com" });
  });

  it("refuses an empty call-back request", async () => {
    const result = await run(callBackAction, { dialCode: "+91", phone: "", email: "  " });

    expect(result).toMatchObject({ ok: false, field: "contact" });
    expect(sentRequests()).toEqual([]);
  });

  it("points a too-long company at the company field, not the name", async () => {
    const atLimit = await run(demoAction, {
      name: "Ravi",
      company: "c".repeat(120),
      dialCode: "+91",
      phone: "9876543210",
    });
    expect(atLimit).toEqual({ ok: true, message: SAVED });

    const overLimit = await run(demoAction, {
      name: "Ravi",
      company: "c".repeat(121),
      dialCode: "+91",
      phone: "9876543210",
    });
    expect(overLimit).toMatchObject({ ok: false, field: "company" });
    expect(sentRequests()).toHaveLength(1);
  });

  it("refuses a NUL character in any text field before anything is sent", async () => {
    const nul = "\u0000";
    for (const field of ["name", "company", "note", "email"]) {
      const result = await run(demoAction, {
        name: "Ravi",
        dialCode: "+91",
        phone: "9876543210",
        [field]: field === "email" ? `ravi${nul}@example.com` : `x${nul}`,
      });
      expect(result).toMatchObject({ ok: false, field: "contact" });
    }
    expect(sentRequests()).toEqual([]);
  });

  it("names the phone rule when the number is too short, with a 0 in front", async () => {
    // "+91" plus 4 digits is 6 digits in all, one short of the 7 the rule needs.
    const short = await run(callBackAction, { dialCode: "+91", phone: "1234" });
    expect(short).toMatchObject({ ok: false, field: "phone" });
    expect(short.ok === false && short.error).toMatch(/7 to 15 digits/);
    expect(sentRequests()).toEqual([]);
  });
});
