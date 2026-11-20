import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { MonthlyEmployeeRow } from "../companyApi";
import { ExportAttendanceButton } from "./AttendanceExport";

// The month table's export builds attendance.csv in one shot — the monthly
// endpoint already returned the whole roster, so there is no page walk and no
// network at all: the file is made from the rows the button was handed, with
// the UTF-8 byte-order mark so Excel reads accents right and formula-
// triggering free text neutralized.

let savedBlob: Blob | null = null;
let createObjectUrlCalls = 0;
let downloads: string[] = [];
let originalClick: typeof HTMLAnchorElement.prototype.click;

beforeEach(() => {
  savedBlob = null;
  createObjectUrlCalls = 0;
  downloads = [];
  // happy-dom cannot resolve a blob: URL — the stub captures the blob the
  // builder made and answers without navigating, and records the filename.
  URL.createObjectURL = ((blob: Blob) => {
    savedBlob = blob;
    createObjectUrlCalls += 1;
    return "blob:stub";
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
  originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
    downloads.push(this.download);
  };
});

afterEach(() => {
  HTMLAnchorElement.prototype.click = originalClick;
  cleanup();
});

function row(overrides: Partial<MonthlyEmployeeRow> = {}): MonthlyEmployeeRow {
  return {
    employeeId: "u-1",
    employeeName: "Priya Nair",
    officeName: "Andheri",
    summary: {
      daysWorked: 9,
      halfDays: 1,
      lateCount: 2,
      leave: 1,
      weeklyOffs: 2,
      holidays: 1,
      workedOnHoliday: 0,
      absent: 3,
      checkoutMissing: 0,
    },
    ...overrides,
  };
}

describe("AttendanceExport: the one-shot roster CSV", () => {
  it("writes every row it was handed, names the file attendance.csv and touches no network", async () => {
    const rows = [
      row(),
      row({
        employeeId: "u-2",
        employeeName: "Amit Sharma",
        officeName: null,
        summary: {
          daysWorked: 14,
          halfDays: 0,
          lateCount: 0,
          leave: 0,
          weeklyOffs: 2,
          holidays: 1,
          workedOnHoliday: 1,
          absent: 0,
          checkoutMissing: 1,
        },
      }),
    ];
    const { getByRole } = render(<ExportAttendanceButton rows={rows} />);
    fireEvent.click(getByRole("button", { name: /Export CSV/ }));
    await waitFor(() => expect(createObjectUrlCalls).toBe(1));
    expect(downloads).toEqual(["attendance.csv"]);
    // One shot: the roster is already here, so nothing is fetched.
    expect(savedBlob).not.toBeNull();
    const text = await (savedBlob as unknown as Blob).text();
    expect(text.startsWith("﻿")).toBe(true);
    const lines = text.split("\n");
    expect(lines.length).toBe(3); // header + 2 rows
    expect(lines[0]).toBe(
      "\ufeffEmployee,Office,Worked,Half days,Late,Leave,Weekly offs,Holidays,Worked on holidays,Absent,Missing check-outs",
    );
    expect(lines[1]).toBe('"Priya Nair","Andheri",9,1,2,1,2,1,0,3,0');
    // A missing office is an empty cell, never the word "null".
    expect(lines[2]).toBe('"Amit Sharma","",14,0,0,0,2,1,1,0,1');
  });

  it("guards formula-triggering names and offices, and escapes quotes", async () => {
    const rows = [
      row({ employeeName: "=Eve Adams", officeName: "+West Branch" }),
      row({ employeeId: "u-3", employeeName: 'Sa"if Khan', officeName: "Andheri" }),
    ];
    const { getByRole } = render(<ExportAttendanceButton rows={rows} />);
    fireEvent.click(getByRole("button", { name: /Export CSV/ }));
    await waitFor(() => expect(createObjectUrlCalls).toBe(1));
    const text = await (savedBlob as unknown as Blob).text();
    // A leading = or + gets a quote-prefix so the spreadsheet reads it as text.
    expect(text).toContain('"\'=Eve Adams"');
    expect(text).toContain('"\'+West Branch"');
    // An embedded quote doubles inside the quoted cell.
    expect(text).toContain('"Sa""if Khan","Andheri"');
  });

  it("sits disabled when nobody is tracked", () => {
    const { getByRole } = render(<ExportAttendanceButton rows={[]} />);
    expect((getByRole("button", { name: /Export CSV/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("says the file could not be built when the browser refuses the blob", async () => {
    URL.createObjectURL = (() => {
      throw new TypeError("no blob store");
    }) as typeof URL.createObjectURL;
    const { getByRole, findByText } = render(<ExportAttendanceButton rows={[row()]} />);
    fireEvent.click(getByRole("button", { name: /Export CSV/ }));
    expect(await findByText("The file could not be created. Try again.")).toBeTruthy();
    expect(createObjectUrlCalls).toBe(0);
  });
});
