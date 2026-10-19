import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import { CountryFlag } from "./CountryFlag";

afterEach(() => {
  cleanup();
});

describe("CountryFlag", () => {
  it("renders nothing when no country is chosen", () => {
    const { container } = render(<CountryFlag iso2={undefined} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for a code that is not a two-letter country code", () => {
    for (const iso2 of ["", "in", "IN1", "../IN", "ZZ", "<script>"]) {
      const { container, unmount } = render(<CountryFlag iso2={iso2} />);
      expect(container.innerHTML).toBe("");
      unmount();
    }
  });

  it("loads and shows the SVG for a known country, hidden from assistive tech", async () => {
    const { container } = render(<CountryFlag iso2="IN" />);

    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    const wrapper = container.querySelector("[aria-hidden='true']");
    expect(wrapper).not.toBeNull();
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("100%");
  });
});
