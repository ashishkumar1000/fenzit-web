import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { ApiError } from "../../services/api";
import { emailLogin, sendOtp, verifyOtp } from "./loginApi";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
  type SentRequest,
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
});

function last(): SentRequest {
  expect(sentRequests()).toHaveLength(1);
  return sentRequests()[0];
}

describe("sendOtp", () => {
  it("posts the dial code and the digits to the otp/send endpoint", async () => {
    setRespond(() =>
      jsonResponse({ otp_session_id: "sess-1", expires_at: "2026-10-23T10:00:00Z" }),
    );

    const result = await sendOtp("+91", "9876543210");

    expect(last()).toMatchObject({
      url: "https://api.test.example/api/v1/auth/otp/send",
      method: "POST",
      body: { countryCode: "+91", phoneNumber: "9876543210" },
    });
    expect(last().headers.get("content-type")).toBe("application/json");
    expect(result).toEqual({ otp_session_id: "sess-1", expires_at: "2026-10-23T10:00:00Z" });
  });
});

describe("verifyOtp", () => {
  it("posts the session id and the code to the otp/verify endpoint", async () => {
    setRespond(() =>
      jsonResponse({
        token: "tok-1",
        user: {
          userId: "u-1",
          tenantId: "t-1",
          role: "company_admin",
          name: "Ravi",
          platformAdmin: false,
        },
      }),
    );

    const result = await verifyOtp("sess-1", "1234");

    expect(last()).toMatchObject({
      url: "https://api.test.example/api/v1/auth/otp/verify",
      method: "POST",
      body: { otpSessionId: "sess-1", otpCode: "1234" },
    });
    expect(result.token).toBe("tok-1");
    expect(result.user.role).toBe("company_admin");
  });
});

describe("emailLogin", () => {
  it("posts the email and the password to the email/login endpoint", async () => {
    setRespond(() =>
      jsonResponse({
        token: "tok-2",
        user: { userId: "u-1", tenantId: null, role: null, name: null, platformAdmin: false },
      }),
    );

    const result = await emailLogin("mona@gmail.com", "secret");

    expect(last()).toMatchObject({
      url: "https://api.test.example/api/v1/auth/email/login",
      method: "POST",
      body: { email: "mona@gmail.com", password: "secret" },
    });
    expect(result.token).toBe("tok-2");
  });
});

describe("error answers", () => {
  it.each([
    [401, "UNAUTHORIZED", "a wrong password"],
    [429, "RATE_LIMITED", "too many attempts"],
  ])(
    "surfaces a %i %s answer as an ApiError the form can branch on (%s)",
    async (status, errorCode) => {
      setRespond(() => jsonResponse({ error_code: errorCode, message: "developer text" }, status));

      const error = await emailLogin("mona@gmail.com", "secret").catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(status);
      expect((error as ApiError).errorCode).toBe(errorCode);
      // The developer-facing message text is carried, but the UI shows messageForError copy.
      expect((error as ApiError).message).not.toBe("That email and password do not match.");
    },
  );

  it("surfaces a connection failure as an ApiError with status 0", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("network down");
    }) as unknown as typeof fetch;

    const error = await sendOtp("+91", "9876543210").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });
});
