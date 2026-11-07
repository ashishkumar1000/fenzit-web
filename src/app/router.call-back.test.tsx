import { afterAll, beforeAll, afterEach, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentTo,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";
import { routes } from "./router";

// The home route binds the call-back action directly — the early-access intent
// router is gone. This pins the wiring at the boundary the form actually uses:
// a submit at "/" must reach /api/v1/contact-requests as a call_back. A wrong
// or missing action binding fails here, not silently in production.

beforeAll(() => useApiBase());
afterAll(() => clearApiBase());

beforeEach(() => {
  installFetchMock();
  setRespond((url) =>
    url.endsWith("/api/v1/contact-requests")
      ? jsonResponse({ message: "Thanks. We will call you back within a day." }, 202)
      : jsonResponse([]),
  );
});

afterEach(() => {
  cleanup();
  restoreFetchMock();
});

function renderHome() {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  render(<RouterProvider router={router} />);
}

describe("the home route's call-back action", () => {
  it("sends a submitted call-back form to /api/v1/contact-requests as a call_back", async () => {
    renderHome();

    await screen.findByLabelText("Email address");
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "owner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "98765 43210" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request a call back" }));

    expect(
      await screen.findByText("Thanks. We will call you back within a day."),
    ).toBeInTheDocument();

    const [sent] = sentTo("/api/v1/contact-requests");
    expect(sent).toBeDefined();
    expect(sent.body).toMatchObject({
      kind: "call_back",
      email: "owner@example.com",
      phone: "+919876543210",
    });
  });

  it("shows the field error and sends nothing when both contact boxes stay empty", async () => {
    renderHome();

    await screen.findByRole("button", { name: "Request a call back" });
    fireEvent.click(screen.getByRole("button", { name: "Request a call back" }));

    expect(
      await screen.findByText("Add a phone number or an email address so we can reach you."),
    ).toBeInTheDocument();
    expect(sentTo("/api/v1/contact-requests")).toHaveLength(0);
  });
});
