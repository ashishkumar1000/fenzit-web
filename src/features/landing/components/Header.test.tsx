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
    expect(screen.getByRole("link", { name: "Your data" }).getAttribute("href")).toBe("/#trust");
    expect(screen.getByRole("link", { name: "Questions" }).getAttribute("href")).toBe("/#faq");
  });

  // The early-access form has its own entry points (hero and section), so the header does not repeat it.
  it("does not show a Join early access link in the header", () => {
    renderHeader();

    expect(screen.queryAllByRole("link", { name: "Join early access" })).toHaveLength(0);
  });

  it("shows Log out in place of Log in when a session is saved", () => {
    writeSession({ token: "test-token", name: "Mona" });
    renderHeader();

    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
  });

  it("shows a Log in link to /login when no session is saved", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
  });

  // Another tab signs out: the storage event must flip this tab's header to Log in.
  it("switches to Log in when the saved session is removed in another tab", () => {
    writeSession({ token: "test-token", name: "Mona" });
    renderHeader();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();

    clearSession();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
    });

    expect(screen.getByRole("link", { name: "Log in" })).toBeTruthy();
  });

  // The BE can return a user with no name. A saved token alone means signed in.
  it("shows Log out when the saved sign-in has no display name", () => {
    writeSession({ token: "test-token", name: null });
    renderHeader();

    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
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
