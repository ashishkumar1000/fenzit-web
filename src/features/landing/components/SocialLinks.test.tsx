import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { FACEBOOK_URL, INSTAGRAM_URL, LINKEDIN_URL } from "../../../config/contact";
import { SocialLinks } from "./SocialLinks";

afterEach(cleanup);

function renderLinks() {
  render(<SocialLinks />);
  return screen.getByRole("group", { name: "Social media" });
}

describe("SocialLinks", () => {
  it("groups exactly three links, each named for its network", () => {
    const group = renderLinks();
    const links = within(group).getAllByRole("link");

    expect(links).toHaveLength(3);
    expect(within(group).getByRole("link", { name: /LinkedIn/ })).toBeInTheDocument();
    expect(within(group).getByRole("link", { name: /Instagram/ })).toBeInTheDocument();
    expect(within(group).getByRole("link", { name: /Facebook/ })).toBeInTheDocument();
  });

  it("points each icon at its own company page, not another network's", () => {
    const group = renderLinks();

    expect(within(group).getByRole("link", { name: /LinkedIn/ })).toHaveAttribute(
      "href",
      LINKEDIN_URL,
    );
    expect(within(group).getByRole("link", { name: /Instagram/ })).toHaveAttribute(
      "href",
      INSTAGRAM_URL,
    );
    expect(within(group).getByRole("link", { name: /Facebook/ })).toHaveAttribute(
      "href",
      FACEBOOK_URL,
    );
  });

  it("sends each icon to the right network's own domain over https", () => {
    const group = renderLinks();
    const expected: Array<[RegExp, string]> = [
      [/LinkedIn/, "www.linkedin.com"],
      [/Instagram/, "www.instagram.com"],
      [/Facebook/, "www.facebook.com"],
    ];

    for (const [name, domain] of expected) {
      const href = within(group).getByRole("link", { name }).getAttribute("href") ?? "";
      const url = new URL(href);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe(domain);
      expect(url.pathname.length).toBeGreaterThan(1);
    }
  });

  it("opens every icon in a new tab with noopener and noreferrer, so the opened page cannot reach this tab", () => {
    const group = renderLinks();

    for (const link of within(group).getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      const rel = link.getAttribute("rel") ?? "";
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
    }
  });

  it("tells screen-reader users that each link opens a new tab", () => {
    const group = renderLinks();

    for (const link of within(group).getAllByRole("link")) {
      expect(link).toHaveAccessibleName(/opens in a new tab/);
    }
  });

  it("never shows a 'coming soon' placeholder in place of a link", () => {
    const { container } = render(<SocialLinks />);

    expect(container.textContent?.toLowerCase()).not.toContain("coming soon");
    expect(screen.queryByRole("img", { name: /coming soon/i })).toBeNull();
  });
});
