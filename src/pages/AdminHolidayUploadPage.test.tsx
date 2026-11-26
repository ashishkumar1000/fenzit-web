import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import ExcelJS from "exceljs";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { writeSession } from "../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// The bulk-upload page's contract: the browser's pre-validation fills the
// error table with NO network call, and a backend-rejected sheet (422 with
// per-row errors) replaces the popup with the BACKEND's rows — the wire's
// truth wins over whatever the browser checked a moment earlier.

/** Under the full suite's load the lazy route's loader flight outlasts
 *  testing-library's 1s default — every async query waits this long. */
const PAGE_WAIT = { timeout: 5_000 };

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

beforeEach(() => {
  installFetchMock();
  setRespond(respondDefault);
});

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  window.sessionStorage.clear();
  cleanup();
});

function holidayRow(): Record<string, unknown> {
  return {
    id: "h-1",
    date: "2026-11-28",
    name: "Dummy Holiday 1",
    description: null,
    scope: "all",
    officeIds: [],
    employeesOff: 94,
  };
}

function overviewPayload(): Record<string, unknown> {
  return {
    year: "2026",
    holidays: [holidayRow()],
    offices: [{ officeId: "o-1", name: "Head Office", staffCount: 12 }],
    unassignedCount: 2,
    weeklyOffDefaults: [{ valid: "[2026-10-01,)", days: [7] }],
  };
}

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    return jsonResponse({
      id: "u-own",
      role: "company_admin",
      name: "Beta Yela",
      platformAdmin: false,
    });
  }
  // The layout's Leave badge shares the /users/me sweep.
  if (url.endsWith("/attendance/leave/summary")) return jsonResponse({ counts: { pending: 0 } });
  if (url.includes("/attendance/holidays/overview")) return jsonResponse(overviewPayload());
  if (url.endsWith("/attendance/holidays")) return jsonResponse([holidayRow()]);
  throw new TypeError(`offline in tests: ${url}`);
}

function bulkAnswer(body: unknown, status: number): void {
  setRespond((url) =>
    url.endsWith("/attendance/holidays/bulk") ? jsonResponse(body, status) : respondDefault(url),
  );
}

/** A filled "Holidays" sheet with real xlsx bytes — the browser parser runs
 *  for real, so the fixture is exactly what a console user's Excel ships. */
async function sheetFile(rows: Array<[string, string | null]>): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Holidays");
  ws.addRow(["Date", "Holiday Name", "Description (optional)", "Offices (optional)"]);
  for (const row of rows) ws.addRow(row);
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], "holidays.xlsx");
}

function renderUpload(entry = "/admin/company/holidays/upload"): HTMLElement {
  writeSession({ token: "tok-1", name: "Beta Yela" });
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  const { container } = render(<RouterProvider router={router} />);
  return container;
}

/** The dropzone's file input is visually hidden (the label IS the dropzone) —
 *  drive it through the DOM, the way a real file pick lands. */
function pickFile(container: HTMLElement, file: File): void {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

async function openConfirmPopup(container: HTMLElement, rows: Array<[string, string | null]>) {
  pickFile(container, await sheetFile(rows));
  await screen.findByText("Add 1 holiday to the calendar?", {}, PAGE_WAIT);
}

describe("AdminHolidayUploadPage: the error table", () => {
  it("browser-caught sheet problems fill the table with NO backend call", async () => {
    const container = renderUpload();
    await screen.findByText("Add Many Holidays at Once", {}, PAGE_WAIT);

    pickFile(container, await sheetFile([["not a date", "Broken"]]));

    await screen.findByText("Nothing was changed — 1 row needs fixing:", {}, PAGE_WAIT);
    expect(screen.getByText("Broken")).toBeInTheDocument();
    expect(screen.getByText(/Use the date as 2026-08-15/)).toBeInTheDocument();
    expect(sentRequests().some((r) => r.url.endsWith("/attendance/holidays/bulk"))).toBe(false);
  });

  it("a 422 from the bulk endpoint replaces the popup with the backend's rows", async () => {
    bulkAnswer(
      {
        errors: [
          {
            row: 2,
            date: "2026-12-25",
            name: "Christmas",
            message: "This date landed while you were reviewing — fix row 2 and upload again.",
          },
        ],
      },
      422,
    );
    const container = renderUpload();
    await screen.findByText("Add Many Holidays at Once", {}, PAGE_WAIT);

    await openConfirmPopup(container, [["2026-12-25", "Christmas"]]);
    fireEvent.click(screen.getByRole("button", { name: "Add 1 holiday" }));

    await screen.findByText("Nothing was changed — 1 row needs fixing:", {}, PAGE_WAIT);
    const table = screen.getByRole("table");
    const firstRow = within(table)
      .getByText("This date landed while you were reviewing — fix row 2 and upload again.")
      .closest("tr");
    expect(firstRow).not.toBeNull();
    expect(within(firstRow as HTMLElement).getByText("2")).toBeInTheDocument();
    expect(within(firstRow as HTMLElement).getByText("Christmas")).toBeInTheDocument();
    // The date rides a " · <date>" echo span beside the name.
    expect(within(firstRow as HTMLElement).getByText(/2026-12-25/)).toBeInTheDocument();
    expect(sentRequests().filter((r) => r.url.endsWith("/attendance/holidays/bulk"))).toHaveLength(
      1,
    );
  });

  it("a confirmed clean sheet lands the done card", async () => {
    bulkAnswer({ created: 1, updated: 0, skipped: 0, holidays: [holidayRow()], updates: [] }, 200);
    const container = renderUpload();
    await screen.findByText("Add Many Holidays at Once", {}, PAGE_WAIT);

    await openConfirmPopup(container, [["2026-12-25", "Christmas"]]);
    fireEvent.click(screen.getByRole("button", { name: "Add 1 holiday" }));

    expect(await screen.findByText("Added 1 holiday", {}, PAGE_WAIT)).toBeInTheDocument();
    expect(
      screen.getByText(/day statuses update on their own\. Bulk uploads stay silent/),
    ).toBeInTheDocument();
  });
});

describe("AdminHolidayUploadPage: the confirm popup's guard rails", () => {
  it("a generated-on stamp older than today warns the sheet may be stale", async () => {
    const container = renderUpload();
    await screen.findByText("Add Many Holidays at Once", {}, PAGE_WAIT);

    // Hand-built workbook with the template's freshness stamp F1 — the
    // popup reads it and warns because the download predates today.
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Holidays");
    ws.addRow(["Date", "Holiday Name", "Description (optional)", "Offices (optional)"]);
    ws.addRow(["2026-12-25", "Christmas", null, null]);
    ws.getCell("F1").value = "Generated on 2026-11-20";
    const buffer = await wb.xlsx.writeBuffer();
    pickFile(container, new File([buffer], "old.xlsx"));

    await screen.findByText("Add 1 holiday to the calendar?", {}, PAGE_WAIT);
    expect(
      screen.getByText(/downloaded on 2026-11-20 — the calendar may have changed since/),
    ).toBeInTheDocument();
  });

  it("a sheet whose every row is already on the calendar disables the confirm button", async () => {
    const container = renderUpload();
    await screen.findByText("Add Many Holidays at Once", {}, PAGE_WAIT);

    // 2026-11-28 "Dummy Holiday 1" rides the loader's list — an unchanged
    // repeat row is "already there", so the popup offers nothing to do.
    pickFile(container, await sheetFile([["2026-11-28", "Dummy Holiday 1"]]));
    // The title AND the disabled confirm button both read "Nothing to change"
    // — aim at the heading so the query is unambiguous.
    await screen.findByRole("heading", { name: "Nothing to change" }, PAGE_WAIT);
    const confirm = screen.getByRole("button", { name: "Nothing to change" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it("the rows date themselves: a sheet of one new and one unchanged row splits the counts", async () => {
    bulkAnswer(
      {
        created: 1,
        updated: 0,
        skipped: 1,
        holidays: [holidayRow()],
        updates: [],
      },
      200,
    );
    const container = renderUpload();
    await screen.findByText("Add Many Holidays at Once", {}, PAGE_WAIT);

    pickFile(
      container,
      await sheetFile([
        ["2026-11-28", "Dummy Holiday 1"], // unchanged — skipped
        ["2026-12-25", "Christmas"], // new — added
      ]),
    );
    await screen.findByText("Add 1 holiday to the calendar?", {}, PAGE_WAIT);
    expect(
      screen.getByText("1 new holiday will be added · 1 row will stay unchanged."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add 1 holiday" }));
    expect(await screen.findByText("Added 1 holiday", {}, PAGE_WAIT)).toBeInTheDocument();
    expect(screen.getByText(/1 row left unchanged/)).toBeInTheDocument();
  });
});

// A small race guard: the popup opens only after the async parse settles —
// waitFor would mask a missing popup, so assert the busy line appears first
// when the sheet is big enough to take a tick. Skipped: the one-row sheets
// here parse synchronously fast enough that the "Checking the sheet…" flash
// is not observable; the rowErrors and confirm states above already pin the
// state machine's ends.
describe("AdminHolidayUploadPage: the dropzone", () => {
  it("rejects a non-xlsx file before any parse or network call", async () => {
    const container = renderUpload();
    await screen.findByText("Add Many Holidays at Once", {}, PAGE_WAIT);

    pickFile(container, new File(["plain text"], "notes.txt"));
    await screen.findByText(
      "That is not an Excel sheet. Upload the .xlsx file you downloaded from here.",
      {},
      PAGE_WAIT,
    );
    expect(sentRequests().some((r) => r.url.endsWith("/attendance/holidays/bulk"))).toBe(false);
  });
});
