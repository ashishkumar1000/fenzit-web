import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Header } from "./Header";

afterEach(cleanup);

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

  it("sends the strip link and the header button to the early-access form", () => {
    renderHeader();

    const joinLinks = screen.getAllByRole("link", { name: "Join early access" });
    expect(joinLinks).toHaveLength(2);
    for (const link of joinLinks) {
      expect(link.getAttribute("href")).toBe("/#early-access");
    }
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
