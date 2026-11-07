import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { IMPORT_COLUMNS } from "./importModel";
import { parseSheetFile } from "./parseSheet";
import { downloadSampleCsv, downloadSampleXlsx, sampleCsvText, sampleRows } from "./sampleFile";

const EXAMPLE_NAME = "EXAMPLE - delete this row";

/** Captures the blob the sample download hands to the browser, and stops a real download. */
let captured: Blob[] = [];
let downloadNames: string[] = [];
const realCreate = URL.createObjectURL;
const realRevoke = URL.revokeObjectURL;

// Registered once for the file: a listener per test would stack up and record each download many times.
document.addEventListener(
  "click",
  (event) => {
    const link = event.target;
    if (link instanceof HTMLAnchorElement && link.download) {
      downloadNames.push(link.download);
      event.preventDefault();
    }
  },
  { capture: true },
);

beforeEach(() => {
  captured = [];
  downloadNames = [];
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    captured.push(blob as Blob);
    return "blob:sample";
  };
  URL.revokeObjectURL = () => {};
});

afterEach(() => {
  URL.createObjectURL = realCreate;
  URL.revokeObjectURL = realRevoke;
});

describe("sample sheet content", () => {
  it("has one header per import column, in the order of the column list", () => {
    const [header] = sampleRows();
    expect(header).toEqual(IMPORT_COLUMNS.map((column) => column.header));
    expect(header).toEqual([
      "name",
      "address",
      "phone",
      "latitude",
      "longitude",
      "city",
      "state",
      "pincode",
      "address_details",
    ]);
  });

  it("has exactly one example row after the header", () => {
    expect(sampleRows()).toHaveLength(2);
  });

  it("marks the example row as an example to delete", () => {
    const [, example] = sampleRows();
    expect(example[0]).toBe(EXAMPLE_NAME);
  });

  it("leaves the example phone blank, so the example cannot import by accident", () => {
    const [header, example] = sampleRows();
    expect(example[header.indexOf("phone")]).toBe("");
  });

  it("builds CSV text as a header line and an example line with no trailing line break", () => {
    const lines = sampleCsvText().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      "name,address,phone,latitude,longitude,city,state,pincode,address_details",
    );
    expect(
      lines[1].startsWith(`${EXAMPLE_NAME},12 MG Road,,,,Bengaluru,Karnataka,560001,Flat 4B`),
    ).toBe(true);
    expect(sampleCsvText().endsWith("\r\n")).toBe(false);
  });
});

describe("sample downloads", () => {
  it("downloads the CSV sample with its file name and CSV type", () => {
    downloadSampleCsv();
    expect(downloadNames).toEqual(["fenzit-customer-sample.csv"]);
    expect(captured[0].type).toBe("text/csv;charset=utf-8");
  });

  it("downloads CSV content that the parser reads back as the same one example row", async () => {
    downloadSampleCsv();
    const text = await captured[0].text();
    expect(text).toBe(sampleCsvText());
    const rows = await parseSheetFile(new File([text], "sample.csv"));
    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(2);
    expect(rows[0].cells.name).toBe(EXAMPLE_NAME);
  });

  it("downloads the XLSX sample that reads back to the same header and example row", async () => {
    await downloadSampleXlsx();
    expect(downloadNames).toEqual(["fenzit-customer-sample.xlsx"]);
    const file = new File([captured[0]], "sample.xlsx");
    const rows = await parseSheetFile(file);
    expect(rows).toHaveLength(1);
    expect(rows[0].cells.name).toBe(EXAMPLE_NAME);
    expect(rows[0].cells.city).toBe("Bengaluru");
    expect(rows[0].cells.phone).toBe("");
  });
});
