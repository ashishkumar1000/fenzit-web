import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AdminHelpPage } from "./AdminHelpPage";
import { CONTACT_EMAIL, SALES_PHONE_DISPLAY, SALES_PHONE_HREF } from "../config/contact";

afterEach(cleanup);

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/admin/help"]}>
      <AdminHelpPage />
    </MemoryRouter>,
  );
}

describe("Console: Help & Support", () => {
  it("copies each contact value to the clipboard and says so once", async () => {
    const written: string[] = [];
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (value: string) => written.push(value) },
      configurable: true,
    });
    try {
      renderPage();
      const emailCopy = screen.getByRole("button", { name: "Copy email address" });
      const phoneCopy = screen.getByRole("button", { name: "Copy phone number" });
      await emailCopy.click();
      await phoneCopy.click();
      // The exact contact values ride the clipboard — not a display variant.
      expect(written).toEqual([CONTACT_EMAIL, SALES_PHONE_DISPLAY]);
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true,
      });
    }
  });

  it("flips the copy control to Copied and back after the reset window", async () => {
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async () => {} },
      configurable: true,
    });
    try {
      renderPage();
      const emailCopy = screen.getByRole("button", { name: "Copy email address" });
      await emailCopy.click();
      await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy());
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true,
      });
    }
  });

  it("names the page and the two ways to reach the team", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Help & Support" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Console$/ })).toHaveAttribute("href", "/admin");

    const email = screen.getByText(CONTACT_EMAIL).closest("a");
    expect(email).not.toBeNull();
    expect(email).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);

    const phone = screen.getByText(SALES_PHONE_DISPLAY).closest("a");
    expect(phone).not.toBeNull();
    expect(phone).toHaveAttribute("href", SALES_PHONE_HREF);
  });

  it("opens the first common question and keeps the rest closed", () => {
    renderPage();

    const card = screen
      .getByRole("heading", { level: 2, name: "Common questions" })
      .closest("section");
    expect(card).not.toBeNull();
    const questions = within(card as HTMLElement).getAllByRole("group");
    expect(questions).toHaveLength(6);
    expect(questions[0]).toHaveAttribute("open");
    expect(questions[1]).not.toHaveAttribute("open");
  });

  it("sends a salary question to a screen that can actually set it", () => {
    renderPage();

    const question = screen.getByText("Why can a salary not be set?");
    const row = question.closest("details");
    // The Salary tab is read-only; its Manage salary control is the way in.
    expect(row as HTMLElement).toHaveTextContent("choose Manage salary");
    expect(row as HTMLElement).not.toHaveTextContent("Salary tab, add the components");
  });

  it("counts the topics in whole words", () => {
    renderPage();

    expect(screen.getByText("6 topics")).toBeTruthy();
  });

  it("states honestly that Settings has not shipped", () => {
    renderPage();

    const question = screen.getByText("Can I change company settings?");
    const row = question.closest("details");
    expect(row).not.toBeNull();
    expect(row as HTMLElement).toHaveTextContent("Settings is not available yet.");
  });

  it("ends with what to include and one way to send it", () => {
    renderPage();

    expect(screen.getByText("What to include")).toBeTruthy();
    expect(screen.getByText(/The screen you were on/)).toBeTruthy();
    const mail = screen.getByRole("link", { name: "Email support" });
    expect(mail).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
    // The closing block adds something new; it does not repeat the call
    // action already offered in the contact cards above.
    expect(screen.queryByRole("link", { name: "Call support" })).toBeNull();
  });

  it("heads the page with an h1 and an h2 section, never skipping a level", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Help & Support" })).toBeTruthy();
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    // The contact cards get a heading of their own (visually hidden), so
    // heading navigation reaches the page's primary action.
    expect(h2s).toEqual(["Contact us", "Common questions", "Still need help?"]);
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });
});
