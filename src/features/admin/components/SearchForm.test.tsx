import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { CountryCode } from "../../../services/countryCodes";
import { SearchForm } from "./SearchForm";

const COUNTRIES: CountryCode[] = [
  { dialCode: "+91", countryName: "India", iso2: "IN" },
  { dialCode: "+1", countryName: "United States", iso2: "US" },
];

afterEach(cleanup);

function renderForm(busy: boolean) {
  const router = createMemoryRouter(
    [
      {
        path: "/admin/account",
        element: <SearchForm action="/admin/account" countries={COUNTRIES} busy={busy} />,
      },
    ],
    { initialEntries: ["/admin/account"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("SearchForm", () => {
  it("is a search landmark with an enabled Search button when idle", () => {
    renderForm(false);
    expect(screen.getByRole("search")).toBeTruthy();
    const button = screen.getByRole("button", { name: "Search" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("locks the country code, number and button while a search runs", () => {
    renderForm(true);
    const button = screen.getByRole("button", { name: "Searching…" }) as HTMLButtonElement;
    const country = screen.getByRole("combobox") as HTMLSelectElement;
    const number = screen.getByRole("textbox", { name: "Phone number" }) as HTMLInputElement;
    expect(button.disabled).toBe(true);
    expect(country.disabled).toBe(true);
    expect(number.disabled).toBe(true);
  });

  it("shows the reason in a status line only while a search runs", () => {
    renderForm(true);
    expect(screen.getByRole("status").textContent).toBe(
      "Please wait. The form is locked until the result shows.",
    );
    cleanup();
    renderForm(false);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("does not use an India-only sample number as the placeholder", () => {
    renderForm(false);
    const number = screen.getByRole("textbox", { name: "Phone number" }) as HTMLInputElement;
    expect(number.placeholder).toBe("Numbers only");
  });
});
