import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

function otpSent(): Response {
  return jsonResponse({ otp_session_id: "sess-1", expires_at: "2026-10-23T10:00:00Z" });
}

function signedIn(name: string | null = "Ravi Kumar"): Response {
  return jsonResponse({
    token: "tok-1",
    user: { userId: "u-1", tenantId: "t-1", role: "company_admin", name, platformAdmin: false },
  });
}

function meResponse(): Response {
  return jsonResponse({ role: "company_admin", name: "Ravi Kumar", platformAdmin: false });
}

/** Renders the real route table at /login, so the page posts to the real login action. */
function renderLogin(): void {
  const router = createMemoryRouter(routes, { initialEntries: ["/login"] });
  render(<RouterProvider router={router} />);
}

function change(field: "Phone or email" | "Password" | "4-digit code", value: string): void {
  fireEvent.change(screen.getByLabelText(field), { target: { value } });
}

function loginButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Login" }) as HTMLButtonElement;
}

describe("LoginForm: the sign-in step", () => {
  it("shows the heading, the labelled field and its hint", async () => {
    renderLogin();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Log in to Fenzit" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Phone or email")).toBeInTheDocument();
    expect(
      screen.getByText("Use the phone number or the email linked to your account."),
    ).toBeInTheDocument();
  });

  it("shows the country code choice for a plain number and hides it once +91 is typed", async () => {
    renderLogin();
    await screen.findByRole("heading", { name: "Log in to Fenzit" });

    change("Phone or email", "98765 43210");
    expect(screen.getByLabelText("Country code")).toBeInTheDocument();

    change("Phone or email", "+91 98765 43210");
    expect(screen.queryByLabelText("Country code")).toBeNull();
  });

  it("never shows a password field for a phone number, and shows one for an email", async () => {
    renderLogin();
    await screen.findByRole("heading", { name: "Log in to Fenzit" });

    change("Phone or email", "9876543210");
    expect(screen.queryByLabelText("Password")).toBeNull();

    change("Phone or email", "mona@gmail.com");
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("hides the password behind a show button that says what it does", async () => {
    renderLogin();
    await screen.findByRole("heading", { name: "Log in to Fenzit" });
    change("Phone or email", "mona@gmail.com");

    const field = screen.getByLabelText("Password") as HTMLInputElement;
    expect(field.type).toBe("password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);

    expect((screen.getByLabelText("Password") as HTMLInputElement).type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps Login disabled with the reason until an email has a password", async () => {
    renderLogin();
    await screen.findByRole("heading", { name: "Log in to Fenzit" });

    change("Phone or email", "mona@gmail.com");
    expect(loginButton()).toBeDisabled();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();

    change("Password", "secret");
    expect(loginButton()).toBeEnabled();
    expect(screen.queryByText("Enter your password.")).toBeNull();
  });

  it("flags a 10-digit number that is not a mobile number while it is typed", async () => {
    renderLogin();
    await screen.findByRole("heading", { name: "Log in to Fenzit" });

    change("Phone or email", "1234567890");

    expect(screen.getByText(/Type the 10-digit mobile number/)).toBeInTheDocument();
  });

  it("posts the cleaned digits and echoes the number on the code step", async () => {
    setRespond((url) => (url.endsWith("/auth/otp/send") ? otpSent() : jsonResponse({})));
    renderLogin();
    await screen.findByRole("heading", { name: "Log in to Fenzit" });

    change("Phone or email", "+91 98765 43210");
    fireEvent.click(loginButton());

    expect(
      await screen.findByText(/Enter the 4-digit code we sent to \+91 98765 43210\./),
    ).toBeInTheDocument();
    expect(sentTo("/auth/otp/send")[0]?.body).toEqual({
      countryCode: "+91",
      phoneNumber: "9876543210",
    });
    expect(screen.getByLabelText("4-digit code")).toBeInTheDocument();
  });

  it("shows the rate-limit copy on the number field when the code cannot be sent", async () => {
    setRespond((url) =>
      url.endsWith("/auth/otp/send")
        ? jsonResponse({ error_code: "RATE_LIMITED", message: "x" }, 429)
        : jsonResponse({}),
    );
    renderLogin();
    await screen.findByRole("heading", { name: "Log in to Fenzit" });

    change("Phone or email", "9876543210");
    fireEvent.click(loginButton());

    expect(
      await screen.findByText("Too many attempts. Wait a few minutes and try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Phone or email")).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("login-identifier-error"),
    );
  });

  it("shows one match-error at the password field for wrong credentials", async () => {
    setRespond((url) =>
      url.endsWith("/auth/email/login")
        ? jsonResponse({ error_code: "UNAUTHORIZED", message: "x" }, 401)
        : jsonResponse({}),
    );
    renderLogin();
    await screen.findByRole("heading", { name: "Log in to Fenzit" });

    change("Phone or email", "mona@gmail.com");
    change("Password", "nope");
    fireEvent.click(loginButton());

    expect(
      await screen.findByText("That email and password do not match. Check them and try again."),
    ).toBeInTheDocument();
    // The error sits on the password field; the identifier field keeps only its hint,
    // so the page never suggests which part was wrong or which emails exist.
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("login-password-error"),
    );
    expect(screen.getByLabelText("Phone or email")).toHaveAttribute(
      "aria-describedby",
      "login-identifier-hint",
    );
  });

  it("says it is logging in and blocks everything while the request runs", async () => {
    let release: (() => void) | undefined;
    setRespond((url) => {
      if (url.endsWith("/users/me")) return meResponse();
      if (!url.endsWith("/auth/email/login")) return jsonResponse({});
      return new Promise((resolve) => {
        release = () => resolve(signedIn());
      });
    });
    renderLogin();
    await screen.findByRole("heading", { name: "Log in to Fenzit" });

    change("Phone or email", "mona@gmail.com");
    change("Password", "secret");
    fireEvent.click(loginButton());

    // The button's name changes while it waits, so it is found by its busy label.
    const busyButton = await screen.findByRole("button", { name: "Logging in…" });
    expect(busyButton).toBeDisabled();
    expect((screen.getByLabelText("Phone or email") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Password") as HTMLInputElement).disabled).toBe(true);

    release?.();
    await screen.findByRole("heading", { name: "Hello, Ravi Kumar" });
    // The sign-in really landed: the console greets the person by name and
    // names their role (a company admin lands as the owner).
    expect(screen.getByText("Signed in as company owner")).toBeInTheDocument();
  });
});
