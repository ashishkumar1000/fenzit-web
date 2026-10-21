import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { NotFoundPage } from "./NotFoundPage";

afterEach(cleanup);

// The page's "Go home" button is a router link, so it needs a router around it.
function renderPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe("NotFoundPage", () => {
  it("says the page was not found in one main heading", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "This page is not here." }),
    ).toBeInTheDocument();
  });

  it("gives a plain reason and a clear way back to the home page", () => {
    renderPage();

    expect(screen.getByText(/The link may be wrong or old/)).toBeInTheDocument();
    const home = screen.getByRole("link", { name: "Go home" });
    expect(home.getAttribute("href")).toBe("/");
  });

  it("hides the decorative illustration from screen readers", () => {
    const { container } = renderPage();

    const art = container.querySelector("svg");
    expect(art).not.toBeNull();
    expect(art?.getAttribute("aria-hidden")).toBe("true");
  });

  it("offers no other action besides going home", () => {
    renderPage();

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
