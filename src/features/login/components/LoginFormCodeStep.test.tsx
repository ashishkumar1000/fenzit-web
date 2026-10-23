import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../../../app/routes";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentTo,
  setRespond,
  useApiBase,
} from "../../../testing/fetchMock";

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
  window.localStorage.clear();
  cleanup();
});

function signedIn(): Response {
  return jsonResponse({
    token: "tok-1",
    user: {
      userId: "u-1",
      tenantId: "t-1",
      role: "company_admin",
      name: "Ravi Kumar",
      platformAdmin: false,
    },
  });
}

function meResponse(): Response {
  return jsonResponse({ role: "company_admin", name: "Ravi Kumar", platformAdmin: false });
}

function renderLogin(): void {
  const router = createMemoryRouter(routes, { initialEntries: ["/login"] });
  render(<RouterProvider router={router} />);
}

function change(field: "Phone or email" | "4-digit code", value: string): void {
  fireEvent.change(screen.getByLabelText(field), { target: { value } });
}

function loginButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Login" }) as HTMLButtonElement;
}

/** The submit button stays disabled until the fetcher is idle again, so a
 * second submit must wait for the first one to settle. */
async function waitUntilIdle(): Promise<void> {
  await waitFor(() => expect(loginButton()).toBeEnabled());
}

/** Signs in up to the code step, where every one of these tests starts. */
async function renderAtCodeStep(): Promise<void> {
  renderLogin();
  await screen.findByRole("heading", { name: "Log in to Fenzit" });
  setRespond((url) =>
    url.endsWith("/auth/otp/send")
      ? jsonResponse({ otp_session_id: "sess-1", expires_at: "2026-10-23T10:00:00Z" })
      : jsonResponse({}),
  );
  change("Phone or email", "98765 43210");
  fireEvent.click(loginButton());
  await screen.findByText(/Enter the 4-digit code we sent to \+91 98765 43210\./);
}

describe("LoginForm: the code step", () => {
  it("keeps the same session when a wrong code is retried", async () => {
    await renderAtCodeStep();
    setRespond((url) =>
      url.endsWith("/auth/otp/verify")
        ? jsonResponse({ error_code: "INVALID_OTP", message: "x" }, 401)
        : jsonResponse({}),
    );

    change("4-digit code", "9999");
    fireEvent.click(loginButton());
    await screen.findByText("That code is not right. Check it and try again.");
    // The retry copy is announced with the code field, not left floating on the page.
    expect(screen.getByLabelText("4-digit code")).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("login-code-error"),
    );
    await waitUntilIdle();

    change("4-digit code", "1234");
    fireEvent.click(loginButton());

    await waitFor(() => expect(sentTo("/auth/otp/verify")).toHaveLength(2));
    expect(sentTo("/auth/otp/verify")[1]?.body).toMatchObject({
      otpSessionId: "sess-1",
      otpCode: "1234",
    });
  });

  it("says the code has expired and offers a new one for the same number", async () => {
    await renderAtCodeStep();
    let sessionCount = 1; // sess-1 was issued before this responder took over.
    setRespond((url) => {
      if (url.endsWith("/auth/otp/verify")) {
        return jsonResponse({ error_code: "OTP_EXPIRED", message: "x" }, 410);
      }
      sessionCount += 1;
      return jsonResponse({
        otp_session_id: `sess-${sessionCount}`,
        expires_at: "2026-10-23T10:00:00Z",
      });
    });

    change("4-digit code", "1234");
    fireEvent.click(loginButton());
    await screen.findByText("That code has expired. Ask for a new one.");
    await waitUntilIdle();
    expect(screen.getByRole("button", { name: "Send new code" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send new code" }));
    await screen.findByText(/Enter the 4-digit code we sent to \+91 98765 43210\./);
    await waitUntilIdle();
    expect(sentTo("/auth/otp/send")).toHaveLength(2);
    expect(sentTo("/auth/otp/send")[1]?.body).toEqual({
      countryCode: "+91",
      phoneNumber: "9876543210",
    });

    // The retry verifies against the NEW session, not the expired one.
    setRespond((url) => {
      if (url.endsWith("/auth/otp/verify")) return signedIn();
      if (url.endsWith("/users/me")) return meResponse();
      return jsonResponse({});
    });
    change("4-digit code", "1234");
    fireEvent.click(loginButton());

    await screen.findByRole("heading", { name: "Company admin" });
    // The landing is the allowed state, not the refused render the heading shares.
    expect(screen.getByText("Signed in as Ravi Kumar")).toBeInTheDocument();
    expect(sentTo("/auth/otp/verify").at(-1)?.body).toMatchObject({
      otpSessionId: "sess-2",
      otpCode: "1234",
    });
  });

  it("asks the person to wait after too many wrong codes", async () => {
    await renderAtCodeStep();
    setRespond((url) =>
      url.endsWith("/auth/otp/verify")
        ? jsonResponse({ error_code: "OTP_SESSION_LOCKED", message: "x" }, 429)
        : jsonResponse({}),
    );

    change("4-digit code", "9999");
    fireEvent.click(loginButton());

    expect(
      await screen.findByText("Too many wrong codes. Wait before you try again."),
    ).toBeInTheDocument();
  });

  it("returns to the number with what was typed still in the field", async () => {
    await renderAtCodeStep();

    fireEvent.click(screen.getByRole("button", { name: "Change number" }));

    expect(await screen.findByLabelText("Phone or email")).toHaveValue("98765 43210");
    expect(screen.queryByLabelText("4-digit code")).toBeNull();
  });

  it("lands on the admin page after the right code", async () => {
    await renderAtCodeStep();
    setRespond((url) => {
      if (url.endsWith("/auth/otp/verify")) return signedIn();
      if (url.endsWith("/users/me")) return meResponse();
      return jsonResponse({});
    });

    change("4-digit code", "1234");
    fireEvent.click(loginButton());

    expect(await screen.findByRole("heading", { name: "Company admin" })).toBeInTheDocument();
    expect(screen.getByText("Signed in as Ravi Kumar")).toBeInTheDocument();
  });
});
