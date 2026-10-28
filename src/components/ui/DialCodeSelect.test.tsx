import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { CountryCode } from "../../services/countryCodes";
import { DialCodeSelect } from "./DialCodeSelect";

// Two countries share +1, so the list must tell them apart by ISO code.
const COUNTRIES: CountryCode[] = [
  { dialCode: "+91", countryName: "India", iso2: "IN" },
  { dialCode: "+1", countryName: "United States", iso2: "US" },
  { dialCode: "+1", countryName: "Canada", iso2: "CA" },
];

afterEach(cleanup);

function renderSelect(compact: boolean, value = "+91") {
  return render(
    <DialCodeSelect
      id="dial"
      name="dialCode"
      countries={COUNTRIES}
      value={value}
      onChange={() => {}}
      compact={compact}
    />,
  );
}

describe("DialCodeSelect", () => {
  it("shows the country name and dial code by default", () => {
    renderSelect(false);
    expect(screen.getByRole("option", { name: "India (+91)" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "United States (+1)" })).toBeTruthy();
  });

  it("keeps the full country name in each option's tooltip by default", () => {
    renderSelect(false);
    expect(screen.getByRole("option", { name: "India (+91)" }).getAttribute("title")).toBe(
      "India (+91)",
    );
  });

  it("shows the ISO code and dial code in compact mode, so shared codes stay distinct", () => {
    renderSelect(true);
    expect(screen.getByRole("option", { name: "IN +91" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "US +1" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "CA +1" })).toBeTruthy();
  });

  it("keeps the full country name in each option's tooltip in compact mode", () => {
    renderSelect(true);
    const canada = screen.getByRole("option", { name: "CA +1" });
    expect(canada.getAttribute("title")).toBe("Canada (+1)");
  });

  it("sizes the hidden sizer to the chosen option in compact mode", () => {
    renderSelect(true, "+91");
    // The visible option and the aria-hidden sizer carry the same text.
    expect(screen.getAllByText("IN +91")).toHaveLength(2);
  });
});
