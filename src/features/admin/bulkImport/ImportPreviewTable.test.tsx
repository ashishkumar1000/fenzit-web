import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { blankCells, type SheetRow } from "./importModel";
import { ImportPreviewTable } from "./ImportPreviewTable";

afterEach(cleanup);

function row(address: string, overrides: Partial<SheetRow> = {}): SheetRow {
  return {
    rowNumber: 2,
    cells: { ...blankCells(), name: "Asha", phone: "9876543210", address },
    check: null,
    geo: "idle",
    ...overrides,
  };
}

function renderRows(rows: SheetRow[], onFetch: (index: number) => void = () => {}) {
  return render(
    <ImportPreviewTable
      rows={rows}
      disabled={false}
      onEdit={() => {}}
      onBlur={() => {}}
      onFetch={onFetch}
    />,
  );
}

describe("Fetch location: when it is off, and why", () => {
  it("is off with a reason for a blank address", () => {
    renderRows([row("")]);
    const button = screen.getByRole("button", { name: "Fetch location" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Add an address first.")).toBeTruthy();
  });

  it("is off with a reason for a two-character address, the one below the minimum", () => {
    renderRows([row("ab")]);
    const button = screen.getByRole("button", { name: "Fetch location" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText("The address needs at least 3 characters.")).toBeTruthy();
  });

  it("is on for a three-character address, the minimum", () => {
    renderRows([row("abc")]);
    const button = screen.getByRole("button", { name: "Fetch location" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("is off while that row's lookup is running", () => {
    renderRows([row("1 Park St", { geo: "loading" })]);
    const button = screen.getByRole("button", { name: "Fetch location" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Looking up this address…")).toBeTruthy();
  });

  it("passes the row's position, not its spreadsheet row number, to the fetch", () => {
    const seen: number[] = [];
    renderRows(
      [row("1 Park St", { rowNumber: 2 }), { ...row("2 Lake Rd"), rowNumber: 7 }],
      (index) => seen.push(index),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Fetch location" })[1]);
    expect(seen).toEqual([1]);
  });
});

describe("row results and flags", () => {
  it("shows the not-found text in plain English after a lookup finds nothing", () => {
    renderRows([row("1 Park St", { geo: "not-found" })]);
    expect(
      screen.getByText(
        "No location found. Check the address, city, state and pincode, then try again.",
      ),
    ).toBeTruthy();
  });

  it("shows each flag as plain text next to the row's result", () => {
    renderRows([
      row("1 Park St", {
        check: {
          status: "valid",
          reasons: [],
          flags: ["no_map_pin", "updates_existing", "country_code_differs"],
        },
      }),
    ]);
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.getByText("No map pin")).toBeTruthy();
    expect(screen.getByText("Will update an existing customer")).toBeTruthy();
    expect(
      screen.getByText("Dial code differs from the country picked for this sheet"),
    ).toBeTruthy();
  });

  it("lists every reason message for a row that needs fixing", () => {
    renderRows([
      row("1 Park St", {
        check: {
          status: "invalid",
          flags: [],
          reasons: [
            { field: "phone", code: "A", message: "Phone is not valid." },
            { field: "latitude", code: "B", message: "Latitude is out of range." },
          ],
        },
      }),
    ]);
    expect(screen.getByText("Needs fixing")).toBeTruthy();
    expect(screen.getByText("Phone is not valid.")).toBeTruthy();
    expect(screen.getByText("Latitude is out of range.")).toBeTruthy();
  });

  it("says a row is not checked yet until the server answers", () => {
    renderRows([row("1 Park St")]);
    expect(screen.getByText("Not checked yet")).toBeTruthy();
  });
});
