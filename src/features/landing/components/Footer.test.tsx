import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Footer } from "./Footer";

afterEach(cleanup);

function renderFooter() {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
  return screen.getByRole("contentinfo");
}

describe("Footer social links", () => {
  it("shows the social group with three links on every page that uses the footer", () => {
    const footer = renderFooter();
    const group = within(footer).getByRole("group", { name: "Social media" });
    const links = within(group).getAllByRole("link");

    expect(links).toHaveLength(3);
  });

  it("opens each social link in a new tab with noopener and noreferrer", () => {
    const footer = renderFooter();
    const group = within(footer).getByRole("group", { name: "Social media" });

    for (const link of within(group).getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      const rel = link.getAttribute("rel") ?? "";
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
    }
  });

  it("does not show the old 'coming soon' LinkedIn placeholder", () => {
    const footer = renderFooter();

    expect(footer.textContent?.toLowerCase()).not.toContain("coming soon");
  });
});
