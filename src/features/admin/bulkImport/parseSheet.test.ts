import { describe, expect, it } from "bun:test";
import writeExcelFile from "write-excel-file/browser";
import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS } from "./importModel";
import { cellText, parseSheetFile, rowsFromRaw, SheetError } from "./parseSheet";

const HEADER = ["name", "address", "phone"];

/** A header plus `count` customer rows, each with all three required cells filled. */
function customerRaw(count: number): unknown[][] {
  const rows: unknown[][] = [HEADER];
  for (let i = 0; i < count; i += 1) {
    rows.push([`Customer ${i}`, `${i} Main Road`, `98765${String(i).padStart(5, "0")}`]);
  }
  return rows;
}

function csvFile(text: string, name = "sheet.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

async function expectSheetError(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  let caught: unknown = null;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(SheetError);
  expect((caught as SheetError).message).toMatch(pattern);
}

describe("cellText: what a spreadsheet cell becomes", () => {
  it("turns blank, null and missing cells into an empty string", () => {
    expect(cellText(null)).toBe("");
    expect(cellText(undefined)).toBe("");
    expect(cellText("   ")).toBe("");
  });

  it("keeps numbers as text, so a phone number and a decimal latitude survive", () => {
    expect(cellText(9876543210)).toBe("9876543210");
    expect(cellText(12.9716)).toBe("12.9716");
    expect(cellText(0)).toBe("0");
  });

  it("keeps a leading zero and a plus sign that a number would lose", () => {
    expect(cellText("011001")).toBe("011001");
    expect(cellText("+919876543210")).toBe("+919876543210");
  });

  it("writes a boolean as text and a date as ISO text", () => {
    expect(cellText(true)).toBe("true");
    expect(cellText(new Date("2026-11-07T00:00:00.000Z"))).toBe("2026-11-07T00:00:00.000Z");
  });

  it("returns empty text for an unknown kind of value rather than throwing", () => {
    expect(cellText({ not: "a cell" })).toBe("");
  });

  it("trims surrounding spaces and keeps Devanagari text exactly", () => {
    expect(cellText("  राम कुमार  ")).toBe("राम कुमार");
  });
});

describe("rowsFromRaw: header matching", () => {
  it("matches headers regardless of case and surrounding spaces", () => {
    const rows = rowsFromRaw([
      ["  NAME ", "Address", " Phone"],
      ["Asha", "1 Park Street", "9876543210"],
    ]);
    expect(rows[0].cells.name).toBe("Asha");
    expect(rows[0].cells.phone).toBe("9876543210");
  });

  it("reads a header with a space as the underscore column (address details)", () => {
    const rows = rowsFromRaw([
      ["name", "address", "phone", "Address Details"],
      ["Asha", "1 Park Street", "9876543210", "Flat 4B"],
    ]);
    expect(rows[0].cells.addressDetails).toBe("Flat 4B");
  });

  it("ignores extra columns and does not care about column order", () => {
    const rows = rowsFromRaw([
      ["Notes", "phone", "address", "name"],
      ["call after 6", "9876543210", "1 Park Street", "Asha"],
    ]);
    expect(rows[0].cells).toMatchObject({
      name: "Asha",
      address: "1 Park Street",
      phone: "9876543210",
    });
  });

  it.each(["name", "address", "phone"])("refuses a sheet with no %s column", (missing) => {
    const header = HEADER.filter((column) => column !== missing);
    expect(() => rowsFromRaw([header, ["a", "b"]])).toThrow(SheetError);
    expect(() => rowsFromRaw([header, ["a", "b"]])).toThrow(`"${missing}" column`);
  });

  it("accepts a sheet that has only the three required columns (optional ones blank)", () => {
    const rows = rowsFromRaw([HEADER, ["Asha", "1 Park Street", "9876543210"]]);
    expect(rows[0].cells.latitude).toBe("");
    expect(rows[0].cells.state).toBe("");
  });
});

describe("rowsFromRaw: row count boundaries", () => {
  it("refuses a file with no rows at all", () => {
    expect(() => rowsFromRaw([])).toThrow(/empty/);
  });

  it("refuses a header with no customer rows", () => {
    expect(() => rowsFromRaw([HEADER])).toThrow(/no customer rows/);
  });

  it("accepts exactly one row, numbered as row 2 (the header is row 1)", () => {
    const rows = rowsFromRaw(customerRaw(1));
    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(2);
  });

  it("accepts exactly 500 rows", () => {
    expect(rowsFromRaw(customerRaw(IMPORT_MAX_ROWS))).toHaveLength(500);
  });

  it("refuses 501 rows and names both the count and the limit", () => {
    expect(() => rowsFromRaw(customerRaw(IMPORT_MAX_ROWS + 1))).toThrow(
      "This sheet has 501 customer rows. The limit is 500 rows per import.",
    );
  });

  it("does not count blank rows toward the 500-row limit", () => {
    const raw = customerRaw(IMPORT_MAX_ROWS);
    raw.splice(10, 0, ["", "", ""], ["  ", null, undefined]);
    expect(rowsFromRaw(raw)).toHaveLength(500);
  });

  it("skips blank rows but keeps the spreadsheet row numbers of the rows around them", () => {
    const rows = rowsFromRaw([
      HEADER,
      ["Asha", "1 Park St", "9876543210"],
      [],
      ["Ravi", "2 Lake Rd", "9123456780"],
    ]);
    expect(rows.map((row) => row.rowNumber)).toEqual([2, 4]);
  });
});

describe("rowsFromRaw: cell content", () => {
  it("keeps Devanagari names and addresses exactly", () => {
    const rows = rowsFromRaw([HEADER, ["राम कुमार", "१२ मेन रोड", "9876543210"]]);
    expect(rows[0].cells.name).toBe("राम कुमार");
    expect(rows[0].cells.address).toBe("१२ मेन रोड");
  });

  it("passes a 256-character name through unchanged, leaving the limit to the server", () => {
    const longName = "A".repeat(256);
    const rows = rowsFromRaw([HEADER, [longName, "1 Park St", "9876543210"]]);
    expect(rows[0].cells.name).toBe(longName);
  });

  it("treats a cell holding only spaces as blank", () => {
    const rows = rowsFromRaw([HEADER, ["Asha", "1 Park St", "   "]]);
    expect(rows[0].cells.phone).toBe("");
  });
});

describe("parseSheetFile: unclosed CSV quotes", () => {
  it("names the row with the quote mark that is not closed, and shows no rows", async () => {
    const text = 'name,address,phone\nAsha,4 Park St,9876543210\n"Ravi,5 Lake Rd,9123456789\n';
    await expect(parseSheetFile(csvFile(text))).rejects.toThrow(
      /Row 3 has a quote mark that is not closed/,
    );
  });
});

describe("parseSheetFile: file-level checks", () => {
  it("refuses a file type that is neither .xlsx nor .csv", async () => {
    await expectSheetError(
      parseSheetFile(new File(["x"], "sheet.pdf")),
      /not supported\. Upload a \.xlsx or \.csv file/,
    );
  });

  it("accepts the extension in upper case", async () => {
    const rows = await parseSheetFile(
      csvFile("name,address,phone\nAsha,1 Park St,9876543210", "SHEET.CSV"),
    );
    expect(rows).toHaveLength(1);
  });

  it("refuses an empty file", async () => {
    await expectSheetError(parseSheetFile(csvFile("")), /This file is empty/);
  });

  it("refuses a file one byte over 5 MB", async () => {
    const big = new File([new Uint8Array(IMPORT_MAX_BYTES + 1)], "big.csv");
    await expectSheetError(parseSheetFile(big), /larger than 5 MB/);
  });

  it("accepts a file exactly 5 MB in size", async () => {
    const header = "name,address,phone\n";
    const padding = "x".repeat(
      IMPORT_MAX_BYTES - header.length - "Asha,1 Park St,9876543210,".length,
    );
    const text = `${header}Asha,1 Park St,9876543210,${padding}`;
    const file = new File([text], "exact.csv");
    expect(file.size).toBe(IMPORT_MAX_BYTES);
    const rows = await parseSheetFile(file);
    expect(rows).toHaveLength(1);
  });
});

describe("parseSheetFile: CSV", () => {
  it("reads quoted fields with commas and line breaks", async () => {
    const text = 'name,address,phone\n"Sharma, R","Flat 2,\nLake Road",9876543210';
    const rows = await parseSheetFile(csvFile(text));
    expect(rows[0].cells.name).toBe("Sharma, R");
    expect(rows[0].cells.address).toBe("Flat 2,\nLake Road");
  });

  it("strips the byte-order mark Excel writes, so the first header still matches", async () => {
    const rows = await parseSheetFile(csvFile("﻿name,address,phone\nAsha,1 Park St,9876543210"));
    expect(rows[0].cells.name).toBe("Asha");
  });

  it("handles Windows line endings", async () => {
    const rows = await parseSheetFile(
      csvFile("name,address,phone\r\nAsha,1 Park St,9876543210\r\n"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cells.phone).toBe("9876543210");
  });

  it("keeps Devanagari text through the UTF-8 read", async () => {
    const rows = await parseSheetFile(
      csvFile("name,address,phone\nसीता देवी,२१ गाँधी चौक,9876543210"),
    );
    expect(rows[0].cells.name).toBe("सीता देवी");
    expect(rows[0].cells.address).toBe("२१ गाँधी चौक");
  });

  it("refuses a CSV with only the header row", async () => {
    await expectSheetError(parseSheetFile(csvFile("name,address,phone\n")), /no customer rows/);
  });

  it("refuses a CSV with no phone column, in plain English", async () => {
    await expectSheetError(
      parseSheetFile(csvFile("name,address\nAsha,1 Park St")),
      /has no "phone" column/,
    );
  });
});

describe("parseSheetFile: XLSX", () => {
  async function xlsxFile(rows: unknown[][], name = "sheet.xlsx"): Promise<File> {
    const blob = await writeExcelFile(rows as never[][]).toBlob();
    return new File([blob], name);
  }

  it("reads a real workbook, turning a numeric phone into text", async () => {
    const file = await xlsxFile([HEADER, ["Asha", "1 Park St", 9876543210]]);
    const rows = await parseSheetFile(file);
    expect(rows[0].cells.phone).toBe("9876543210");
  });

  it("refuses a workbook with a 501st row", async () => {
    const file = await xlsxFile(customerRaw(IMPORT_MAX_ROWS + 1));
    await expectSheetError(parseSheetFile(file), /501 customer rows/);
  });

  it("refuses a file named .xlsx that is not a workbook, with no rows", async () => {
    const garbage = new File([new TextEncoder().encode("this is not a zip")], "broken.xlsx");
    await expectSheetError(parseSheetFile(garbage), /could not read this \.xlsx file/);
  });
});
