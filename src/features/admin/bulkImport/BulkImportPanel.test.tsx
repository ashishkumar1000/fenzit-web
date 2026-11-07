import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CountryCode } from "../../../services/countryCodes";
import { clearSession, writeSession } from "../../../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../../../testing/fetchMock";
import { BulkImportPanel } from "./BulkImportPanel";

const COMPANY = "11111111-2222-4333-8444-555555555555";
const COUNTRIES: CountryCode[] = [
  { dialCode: "+91", countryName: "India", iso2: "IN" },
  { dialCode: "+1", countryName: "United States", iso2: "US" },
];

/** Validate answers each row by position, using the statuses given. */
function serveValidate(statuses: Array<"valid" | "invalid">) {
  setRespond((url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/validate")) {
      const body = sentRequests().at(-1)?.body as { rows: unknown[] };
      return jsonResponse({
        rows: body.rows.map((_, rowIndex) => ({
          rowIndex,
          status: statuses[rowIndex],
          reasons:
            statuses[rowIndex] === "invalid"
              ? [{ field: "phone", code: "PHONE_INVALID", message: "Phone is not valid." }]
              : [],
          flags: [],
          existingCustomerId: null,
        })),
        summary: { total: 0, valid: 0, invalid: 0, willUpdateExisting: 0, noMapPin: 0 },
      });
    }
    if (path.endsWith("/commit")) {
      return jsonResponse({
        batchId: "b1",
        rows: [
          { rowIndex: 0, status: "created", customerId: "c1", reasons: [] },
          {
            rowIndex: 1,
            status: "failed",
            customerId: null,
            reasons: [
              { field: "phone", code: "X", message: "Phone already used by another customer." },
            ],
          },
        ],
        summary: { total: 2, created: 1, updated: 0, failed: 1 },
      });
    }
    return jsonResponse({}, 404);
  });
}

/** Chooses a file in the panel's file input, the way a browser does. */
function chooseFile(file: unknown): void {
  const input = screen.getByLabelText("Choose a .xlsx or .csv file") as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

function csvFile(text: string, name = "sheet.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

const TWO_ROWS = "name,address,phone\nAsha,1 Park St,9876543210\nRavi,2 Lake Rd,9123456780";

beforeAll(() => useApiBase());
afterAll(() => clearApiBase());

beforeEach(() => {
  installFetchMock();
  writeSession({ token: "staff-token", name: null });
});

afterEach(() => {
  cleanup();
  restoreFetchMock();
  clearSession();
});

describe("states before any file", () => {
  it("asks for a company when none is picked, and offers no file input", () => {
    render(<BulkImportPanel companyId={null} countries={COUNTRIES} />);
    expect(screen.getByText("Pick a company above before you import its customers.")).toBeTruthy();
    expect(screen.queryByLabelText("Choose a .xlsx or .csv file")).toBeNull();
  });

  it("shows the empty state, the limits and the sample downloads on first view", () => {
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    expect(screen.getByText("No rows yet. Choose a file above to see its rows here.")).toBeTruthy();
    expect(screen.getByText(/Limits: 500 rows, 5 MB, \.xlsx or \.csv\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download sample .xlsx" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download sample .csv" })).toBeTruthy();
  });

  it("shows the format's required and optional columns, with address_details named as the sheet names it", () => {
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    expect(screen.getByRole("cell", { name: "address_details" })).toBeTruthy();
    // name, address and phone are the three required columns.
    expect(screen.getAllByRole("cell", { name: "Yes" })).toHaveLength(3);
    expect(screen.getAllByRole("cell", { name: "No" })).toHaveLength(6);
  });
});

describe("loading and error states", () => {
  it("shows a reading status and locks the file input while a file is being read", async () => {
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    let finish: (text: string) => void = () => {};
    const contents = new Promise<string>((resolve) => {
      finish = resolve;
    });
    const slowFile = { name: "sheet.csv", size: 40, text: () => contents };
    chooseFile(slowFile);
    // Text queries, not role queries: role lookup over the whole panel is slow in happy-dom.
    expect(screen.getByText("Reading your file…")).toBeTruthy();
    const input = screen.getByLabelText("Choose a .xlsx or .csv file") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    finish(TWO_ROWS);
    // A short settle inside act. waitFor takes seconds on this panel in happy-dom.
    await act(async () => {
      await new Promise((done) => setTimeout(done, 50));
    });
    expect(screen.queryByText("Reading your file…")).toBeNull();
  });

  it("shows a plain-English alert, no rows and no empty-state line for an unsupported file", async () => {
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    chooseFile(csvFile("x", "sheet.pdf"));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("This file type is not supported. Upload a .xlsx or .csv file.");
    expect(screen.queryByText("No rows yet. Choose a file above to see its rows here.")).toBeNull();
    expect(screen.queryByRole("button", { name: /Import/ })).toBeNull();
    expect(sentRequests()).toHaveLength(0);
  });

  it("names the missing column in plain English when the header row lacks phone", async () => {
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    chooseFile(csvFile("name,address\nAsha,1 Park St"));
    expect((await screen.findByRole("alert")).textContent).toContain('has no "phone" column');
  });
});

describe("check, submit gate and results", () => {
  it("counts ready and needs-fixing rows and labels the button with the ready count", async () => {
    serveValidate(["valid", "invalid"]);
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    chooseFile(csvFile(TWO_ROWS));
    expect(await screen.findByText("1 ready, 1 need fixing.")).toBeTruthy();
    const button = screen.getByRole("button", { name: "Import 1 customer" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(screen.getByText("Phone is not valid.")).toBeTruthy();
  });

  it("disables the import button with a reason when no row is ready", async () => {
    serveValidate(["invalid", "invalid"]);
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    chooseFile(csvFile(TWO_ROWS));
    await screen.findByText("0 ready, 2 need fixing.");
    const button = screen.getByRole("button", { name: "Import 0 customers" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(
      screen.getByText("No row is ready yet. Fix the rows that need fixing first."),
    ).toBeTruthy();
  });

  it("disables the button with a reason after an edit, until the edited row is checked again", async () => {
    serveValidate(["valid", "valid"]);
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    chooseFile(csvFile(TWO_ROWS));
    await screen.findByText("2 ready, 0 need fixing.");
    const phone = screen.getByLabelText("phone, row 2") as HTMLInputElement;
    fireEvent.change(phone, { target: { value: "" } });
    // The edited row is no longer ready, so only one row counts toward the button.
    const button = screen.getByRole("button", { name: "Import 1 customer" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(
      screen.getByText(
        "Some cells changed. Click outside the cell, or press Tab, so every row is checked.",
      ),
    ).toBeTruthy();
  });

  it("maps each result to its row by rowIndex, even when a blank line makes row numbers skip", async () => {
    serveValidate(["valid", "valid"]);
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    chooseFile(
      csvFile("name,address,phone\nAsha,1 Park St,9876543210\n\nRavi,2 Lake Rd,9123456780"),
    );
    await screen.findByText("2 ready, 0 need fixing.");
    fireEvent.click(screen.getByRole("button", { name: "Import 2 customers" }));
    expect(await screen.findByText("1 created, 0 updated, 1 not saved.")).toBeTruthy();
    expect(screen.getByText("Row 2")).toBeTruthy();
    expect(screen.getByText("Row 4")).toBeTruthy();
    expect(screen.queryByText("Row 3")).toBeNull();
    expect(screen.getByText("Phone already used by another customer.")).toBeTruthy();
  });

  it("does not let the same sheet be imported twice from the screen, and says so", async () => {
    serveValidate(["valid", "valid"]);
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    chooseFile(csvFile(TWO_ROWS));
    await screen.findByText("2 ready, 0 need fixing.");
    fireEvent.click(screen.getByRole("button", { name: "Import 2 customers" }));
    await screen.findByText("Import finished");
    const button = screen.getByRole("button", { name: "Import 2 customers" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(
      screen.getByText("This sheet is already imported. Start over to import another file."),
    ).toBeTruthy();
  });

  it("returns to the empty state when Start over is pressed", async () => {
    serveValidate(["valid", "valid"]);
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    chooseFile(csvFile(TWO_ROWS));
    await screen.findByText("2 ready, 0 need fixing.");
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText("No rows yet. Choose a file above to see its rows here.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Import/ })).toBeNull();
  });

  it("names the company it writes to on every request, and only that company", async () => {
    serveValidate(["valid", "valid"]);
    render(<BulkImportPanel companyId={COMPANY} countries={COUNTRIES} />);
    chooseFile(csvFile(TWO_ROWS));
    await screen.findByText("2 ready, 0 need fixing.");
    const companies = new Set(sentRequests().map((request) => request.headers.get("X-Company-Id")));
    expect([...companies]).toEqual([COMPANY]);
  });
});
