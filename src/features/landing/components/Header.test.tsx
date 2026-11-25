import { afterEach, describe, expect, it } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { clearSession, SESSION_KEY, writeSession } from "../../../services/session";
import { Header } from "./Header";

afterEach(() => {
  cleanup();
  clearSession();
});

// The brand is a router Link, so the header renders inside a memory router in every test.
function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe("Header", () => {
  // The anchors are qualified with the home path: the header renders on every page, and a bare
  // "#how-it-works" would jump nowhere outside home.
  it("links each section name to its anchor on the home page", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "How it works" }).getAttribute("href")).toBe(
      "/#how-it-works",
    );
    expect(screen.getByRole("link", { name: "Features" }).getAttribute("href")).toBe("/#features");
    expect(screen.getByRole("link", { name: "Questions" }).getAttribute("href")).toBe("/#faq");
  });

  // The download panel on the home page is the one place to point at, so the strip links there
  // with the qualified home path — the strip renders on every page.
  it("links the strip's Get the app to the home download section", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "Get the app" }).getAttribute("href")).toBe(
      "/#get-app",
    );
    expect(
      screen.getByText("The Fenzit app is live on Google Play and the App Store."),
    ).toBeTruthy();
  });

  // The console is the signed-in landing for every role — the same place the
  // login flow redirects to (/admin; the console's own gates route members).
  it("shows a Dashboard link into the console when a session is saved", () => {
    writeSession({ token: "test-token", name: "Mona" });
    renderHeader();

    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("href")).toBe("/admin");
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
  });

  it("shows a Log in link to /login when no session is saved", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
  });

  // Another tab signs out: the storage event must flip this tab's header to Log in.
  it("switches to Log in when the saved session is removed in another tab", () => {
    writeSession({ token: "test-token", name: "Mona" });
    renderHeader();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy();

    clearSession();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
    });

    expect(screen.getByRole("link", { name: "Log in" })).toBeTruthy();
  });

  // The BE can return a user with no name. A saved token alone means signed in.
  it("shows Dashboard when the saved sign-in has no display name", () => {
    writeSession({ token: "test-token", name: null });
    renderHeader();

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
  });

  it("keeps the page sections in one labelled navigation landmark", () => {
    renderHeader();

    expect(screen.getByRole("navigation", { name: "Page sections" })).toBeInTheDocument();
  });

  it("makes the brand a link to the home page", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "Fenzit" }).getAttribute("href")).toBe("/");
  });
});
