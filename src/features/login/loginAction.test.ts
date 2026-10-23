import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import type { ActionFunctionArgs } from "react-router";
import type { LoginActionResult } from "./loginAction";
import { loginAction } from "./loginAction";
import { SESSION_KEY } from "../../services/session";
import { formatPhoneLabel, INDIA_ONLY_MESSAGE, LOGIN_DIAL_CODE } from "./loginInput";
import { breakStorage, restoreStorage } from "../../testing/brokenStorage";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  sentTo,
  setRespond,
  useApiBase,
} from "../../testing/fetchMock";

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

beforeEach(() => {
  installFetchMock();
});

afterEach(() => {
  restoreFetchMock();
  restoreStorage();
  window.localStorage.clear();
});

function formWith(fields: Record<string, string>): Promise<LoginActionResult | Response> {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  const request = new Request("https://test/login", { method: "POST", body: form });
  return loginAction({
    request,
    url: new URL(request.url),
    pattern: "/login",
    params: {},
    // The action never reads the router context; the stub satisfies its type
    // without a blanket cast over the whole args object.
    context: {
      get: () => undefined,
      set: () => undefined,
    } as ActionFunctionArgs["context"],
  });
}

function signInBody(): { token: string; user: { name: string | null } } {
  return {
    token: "tok-1",
    user: { name: "Ravi Kumar" },
  };
}

function expectStep(result: LoginActionResult | Response): asserts result is LoginActionResult {
  expect(result).not.toBeInstanceOf(Response);
}

function expectRedirect(result: LoginActionResult | Response, to: string): void {
  expect(result).toBeInstanceOf(Response);
  const response = result as Response;
  expect(response.headers.get("Location")).toBe(to);
}

describe("loginAction: the sign-in step", () => {
  it("asks for a phone number or email when the field is empty", async () => {
    const result = await formWith({ identifier: "  " });

    expectStep(result);
    expect(result).toEqual({
      step: "sign-in",
      error: { field: "identifier", message: "Enter your phone number or email." },
    });
    expect(sentRequests()).toEqual([]);
  });

  it("rejects a short phone number before calling the backend", async () => {
    const result = await formWith({ identifier: "987654321" });

    expectStep(result);
    expect(result.step).toBe("sign-in");
    expect(result.error?.field).toBe("identifier");
    expect(result.error?.message).toMatch(/10-digit mobile number/);
    expect(sentRequests()).toEqual([]);
  });

  it("refuses a non-Indian dial code before calling the backend", async () => {
    const result = await formWith({ identifier: "+44 7911 123456" });

    expectStep(result);
    expect(result.error).toEqual({ field: "identifier", message: INDIA_ONLY_MESSAGE });
    expect(sentRequests()).toEqual([]);
  });

  it("rejects a malformed email before calling the backend", async () => {
    const result = await formWith({ identifier: "mona@gmail" });

    expectStep(result);
    expect(result.error).toEqual({ field: "identifier", message: "Enter a valid email address." });
    expect(sentRequests()).toEqual([]);
  });

  it("asks for the password when an email signs in with none", async () => {
    const result = await formWith({ identifier: "mona@gmail.com", password: "" });

    expectStep(result);
    expect(result.error).toEqual({ field: "password", message: "Enter your password." });
    expect(sentRequests()).toEqual([]);
  });

  it("sends a code to the +91 number and moves to the code step", async () => {
    setRespond(() =>
      jsonResponse({ otp_session_id: "sess-9", expires_at: "2026-10-23T10:00:00Z" }),
    );

    const result = await formWith({ identifier: "98765 43210" });

    expect(sentTo("/auth/otp/send")[0]).toMatchObject({
      url: "https://api.test.example/api/v1/auth/otp/send",
      body: { countryCode: "+91", phoneNumber: "9876543210" },
    });
    expect(result).toEqual({
      step: "code",
      otpSessionId: "sess-9",
      phoneLabel: "+91 98765 43210",
    });
  });

  it("stays on the sign-in step with the rate-limit copy when the send is throttled", async () => {
    setRespond(() => jsonResponse({ error_code: "RATE_LIMITED", message: "x" }, 429));

    const result = await formWith({ identifier: "9876543210" });

    expectStep(result);
    expect(result.error).toEqual({
      field: "identifier",
      message: "Too many attempts. Wait a few minutes and try again.",
    });
  });

  it("stays on the sign-in step with the connection copy when the send fails offline", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("network down");
    }) as unknown as typeof fetch;

    const result = await formWith({ identifier: "9876543210" });

    expectStep(result);
    expect(result.error).toEqual({
      field: "identifier",
      message: "Could not reach the server. Check your connection and try again.",
    });
  });

  it("signs an email in, saves only the token and the name, and goes to /admin", async () => {
    setRespond(() => jsonResponse(signInBody()));

    const result = await formWith({ identifier: "Mona@Gmail.com", password: "secret" });

    expect(sentTo("/auth/email/login")[0]).toMatchObject({
      url: "https://api.test.example/api/v1/auth/email/login",
      body: { email: "mona@gmail.com", password: "secret" },
    });
    expectRedirect(result, "/admin");
    const stored: unknown = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null");
    // The web login spec: never store the role; it comes from GET /users/me.
    expect(stored).toEqual({ token: "tok-1", name: "Ravi Kumar" });
  });

  it("gives the same wrong-credentials message for any 401, so it never reveals which emails exist", async () => {
    setRespond(() => jsonResponse({ error_code: "UNAUTHORIZED", message: "x" }, 401));

    const result = await formWith({ identifier: "mona@gmail.com", password: "nope" });

    expectStep(result);
    expect(result.error).toEqual({
      field: "password",
      message: "That email and password do not match. Check them and try again.",
    });
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("shows the permission copy as a form error when a removed member is refused with 403", async () => {
    setRespond(() => jsonResponse({ error_code: "FORBIDDEN", message: "x" }, 403));

    const result = await formWith({ identifier: "mona@gmail.com", password: "secret" });

    expectStep(result);
    expect(result.error).toEqual({
      field: "form",
      message: "You do not have permission to do this.",
    });
  });

  it("shows the server copy as a form error on a 500", async () => {
    setRespond(() => jsonResponse({ error_code: "INTERNAL", message: "x" }, 500));

    const result = await formWith({ identifier: "mona@gmail.com", password: "secret" });

    expectStep(result);
    expect(result.error).toEqual({
      field: "form",
      message: "Something went wrong on our side. Try again in a moment.",
    });
  });

  it("explains a refused save instead of redirecting to a page that will sign out", async () => {
    setRespond(() => jsonResponse(signInBody()));
    breakStorage("setItem");

    const result = await formWith({ identifier: "mona@gmail.com", password: "secret" });

    expectStep(result);
    expect(result.error).toEqual({
      field: "form",
      message: "We could not save your sign-in. Turn off private browsing and try again.",
    });
    restoreStorage();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe("loginAction: the code step", () => {
  const codeForm = {
    intent: "verify-code",
    otpSessionId: "sess-9",
    phoneLabel: "+91 98765 43210",
  };

  it.each([
    ["", "no code typed"],
    ["12", "too short"],
    ["12345", "too long"],
    ["abcd", "letters"],
    ["12 34", "a space splits the digits"],
  ])("keeps the code step and asks for the 4 digits when %j is typed (%s)", async (code) => {
    const result = await formWith({ ...codeForm, otpCode: code });

    expectStep(result);
    expect(result).toMatchObject({
      step: "code",
      otpSessionId: "sess-9",
      phoneLabel: "+91 98765 43210",
      error: { field: "code", message: "Enter the 4-digit code we sent you." },
    });
    expect(sentRequests()).toEqual([]);
  });

  it("verifies a pasted code with surrounding spaces", async () => {
    setRespond(() => jsonResponse(signInBody()));

    const result = await formWith({ ...codeForm, otpCode: " 1234 " });

    expect(sentTo("/auth/otp/verify")[0]).toMatchObject({
      url: "https://api.test.example/api/v1/auth/otp/verify",
      body: { otpSessionId: "sess-9", otpCode: "1234" },
    });
    expectRedirect(result, "/admin");
    const stored: unknown = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null");
    // The same rule as the email path: never store the role.
    expect(stored).toEqual({ token: "tok-1", name: "Ravi Kumar" });
  });

  it("stays on the code step with the retry copy for a wrong code, keeping the same session", async () => {
    setRespond(() => jsonResponse({ error_code: "INVALID_OTP", message: "x" }, 401));

    const result = await formWith({ ...codeForm, otpCode: "9999" });

    expectStep(result);
    expect(result).toMatchObject({
      step: "code",
      otpSessionId: "sess-9",
      error: { field: "code", message: "That code is not right. Check it and try again." },
    });
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("tells the person the code has expired", async () => {
    setRespond(() => jsonResponse({ error_code: "OTP_EXPIRED", message: "x" }, 410));

    const result = await formWith({ ...codeForm, otpCode: "1234" });

    expectStep(result);
    expect(result.error).toEqual({
      field: "code",
      message: "That code has expired. Ask for a new one.",
    });
  });

  it("tells the person to wait after too many wrong codes", async () => {
    setRespond(() => jsonResponse({ error_code: "OTP_SESSION_LOCKED", message: "x" }, 429));

    const result = await formWith({ ...codeForm, otpCode: "1234" });

    expectStep(result);
    expect(result.error).toEqual({
      field: "code",
      message: "Too many wrong codes. Wait before you try again.",
    });
  });

  it("stays on the code step with the connection copy when the verify fails offline", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("network down");
    }) as unknown as typeof fetch;

    const result = await formWith({ ...codeForm, otpCode: "1234" });

    expectStep(result);
    expect(result.error).toEqual({
      field: "code",
      message: "Could not reach the server. Check your connection and try again.",
    });
  });

  it("stays on the code step with the server copy when the verify answers 500", async () => {
    setRespond(() => jsonResponse({ error_code: "INTERNAL", message: "x" }, 500));

    const result = await formWith({ ...codeForm, otpCode: "1234" });

    expectStep(result);
    expect(result.error).toEqual({
      field: "code",
      message: "Something went wrong on our side. Try again in a moment.",
    });
  });

  it("explains a refused save and keeps the code step, so the code is not asked for twice", async () => {
    setRespond(() => jsonResponse(signInBody()));
    breakStorage("setItem");

    const result = await formWith({ ...codeForm, otpCode: "1234" });

    expectStep(result);
    expect(result.step).toBe("code");
    expect(result.error?.field).toBe("form");
    restoreStorage();
  });

  it("falls back to the bare dial code when the form carries no phone label", async () => {
    setRespond(() => jsonResponse({ error_code: "INVALID_OTP", message: "x" }, 401));

    const result = await formWith({
      intent: "verify-code",
      otpSessionId: "sess-9",
      otpCode: "1234",
    });

    expectStep(result);
    // The fallback is what the code-step caption shows: the dial code alone.
    expect(result).toMatchObject({
      step: "code",
      phoneLabel: formatPhoneLabel(LOGIN_DIAL_CODE, ""),
    });
  });
});
