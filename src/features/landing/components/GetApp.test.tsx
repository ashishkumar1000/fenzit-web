import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PLAY_STORE_URL, APP_STORE_URL } from "../../../config/appStores";
import { GetApp } from "./GetApp";

afterEach(cleanup);

function renderPanel() {
  return render(
    <MemoryRouter>
      <GetApp />
    </MemoryRouter>,
  );
}

describe("GetApp", () => {
  it("renders both store badges, the demo fallback and the scan tiles", () => {
    renderPanel();

    expect(
      screen.getByRole("link", { name: "Get Fenzit on Google Play (opens the Play Store)" }),
    ).toHaveAttribute("href", PLAY_STORE_URL);
    expect(
      screen.getByRole("link", { name: "Download Fenzit on the App Store (opens the App Store)" }),
    ).toHaveAttribute("href", APP_STORE_URL);
    expect(screen.getByRole("link", { name: /book a demo/i })).toHaveAttribute(
      "href",
      "/book-demo",
    );
    expect(
      screen.getByAltText("QR code that opens the Fenzit app download page"),
    ).toBeInTheDocument();
    expect(screen.getByText("Scan to install on your phone.")).toBeInTheDocument();
  });

  it("keeps every perk to a fact true today", () => {
    renderPanel();

    for (const perk of screen.getAllByRole("listitem")) {
      expect(
        /90 days free|owners and employees|phone-number sign-in/i.test(perk.textContent!),
      ).toBe(true);
    }
  });
});
