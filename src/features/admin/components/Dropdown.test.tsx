import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Dropdown, type DropdownOption } from "./Dropdown";

afterEach(cleanup);

const OPTIONS: DropdownOption[] = [
  { value: "e1", label: "Asha V", meta: "+91 90000 00001" },
  { value: "e2", label: "Bunty R", meta: "+91 90000 00002" },
];

function renderDropdown(props: {
  searchPlaceholder?: string;
  noMatchText?: (query: string) => string;
}): void {
  render(
    <Dropdown
      label="Select Employee"
      options={OPTIONS}
      value="e1"
      onChange={() => {}}
      {...props}
    />,
  );
}

function openPopup(): void {
  fireEvent.click(screen.getByRole("button", { name: /Select Employee/ }));
}

describe("Dropdown: the popup's search line", () => {
  it("derives the search placeholder from the label by default", () => {
    renderDropdown({});
    openPopup();
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Search select employee…");
  });

  it("the placeholder override keeps a picker label from reading as 'Search select employee…'", () => {
    renderDropdown({ searchPlaceholder: "Search employees…" });
    openPopup();
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Search employees…");
  });

  it("an emptied search says No match for the typed query", () => {
    renderDropdown({});
    openPopup();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz" } });
    expect(screen.getByText("No match for “zzz”.", { exact: false })).toBeInTheDocument();
  });

  it("the no-match override echoes the query so the line can still name the person", () => {
    renderDropdown({ noMatchText: (query) => `No employee found for “${query}”.` });
    openPopup();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Anil" } });
    expect(screen.getByText("No employee found for “Anil”.", { exact: false })).toBeInTheDocument();
  });

  it("a phone-shaped query still finds its person by the digits", () => {
    renderDropdown({});
    openPopup();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "90000 00002" } });
    expect(screen.getByRole("option", { name: /Bunty R/ })).toBeInTheDocument();
  });
});
