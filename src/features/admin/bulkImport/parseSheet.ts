import { readSheet } from "read-excel-file/browser";
import Papa from "papaparse";
import {
  IMPORT_COLUMNS,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  blankCells,
  type SheetCells,
  type SheetRow,
} from "./importModel";
import { checkXlsxUnpackedSize } from "./xlsxSizeGuard";
import { SheetError } from "./sheetError";

export { SheetError } from "./sheetError";

type FileKind = "xlsx" | "csv";

function fileKind(name: string): FileKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".csv")) return "csv";
  return null;
}

/** Turns one spreadsheet cell into text. Blank, missing and unknown values become "". */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/** Header text as matched against the column list: trimmed, lower case, spaces as underscores. */
function headerKey(value: unknown): string {
  return cellText(value).toLowerCase().replace(/\s+/g, "_");
}

async function readXlsxRows(file: File): Promise<unknown[][]> {
  // Check the unpacked size from the zip directory first, so a zip bomb never reaches the reader.
  checkXlsxUnpackedSize(new Uint8Array(await file.arrayBuffer()));
  try {
    return await readSheet(file, { trim: true });
  } catch {
    throw new SheetError("We could not read this .xlsx file. Save it again from Excel and retry.");
  }
}

async function readCsvRows(file: File): Promise<unknown[][]> {
  // Excel often writes a byte-order mark at the start, which would stick to the first header.
  const text = (await file.text()).replace(/^\uFEFF/, "");
  // Blank lines are kept on purpose: they keep row numbers equal to the sheet's. Empty rows are dropped later.
  const parsed = Papa.parse<string[]>(text);
  // An unclosed quote folds the rest of the file into one cell, so refuse it rather than guess.
  const quote = parsed.errors.find((error) => error.type === "Quotes");
  if (quote) {
    throw new SheetError(
      `Row ${(quote.row ?? 0) + 1} has a quote mark that is not closed. Fix the quote marks in the .csv file and try again.`,
    );
  }
  return parsed.data;
}

/**
 * Reads a staff sheet in the browser: header row first, then one customer per row.
 * The server checks every row again, so this only decides what is shown.
 * Throws SheetError (plain English) for anything it cannot use.
 */
export async function parseSheetFile(file: File): Promise<SheetRow[]> {
  const kind = fileKind(file.name);
  if (kind === null) {
    throw new SheetError("This file type is not supported. Upload a .xlsx or .csv file.");
  }
  if (file.size === 0) {
    throw new SheetError("This file is empty. Choose the file again.");
  }
  if (file.size > IMPORT_MAX_BYTES) {
    throw new SheetError(
      "This file is larger than 5 MB. Split it into smaller files and upload each one.",
    );
  }
  const raw = kind === "xlsx" ? await readXlsxRows(file) : await readCsvRows(file);
  return rowsFromRaw(raw);
}

/** Maps the raw rows to customer rows. Exported for the parser's tests. */
export function rowsFromRaw(raw: unknown[][]): SheetRow[] {
  if (raw.length === 0) {
    throw new SheetError("This file is empty. Choose the file again.");
  }
  const header = raw[0].map(headerKey);
  const columnIndex = new Map<string, number>();
  for (const column of IMPORT_COLUMNS) {
    const index = header.indexOf(column.header);
    if (index === -1 && column.required) {
      throw new SheetError(
        `This sheet has no "${column.header}" column. Add it to the first row, then upload again.`,
      );
    }
    if (index !== -1) columnIndex.set(column.field, index);
  }

  const rows: SheetRow[] = [];
  raw.slice(1).forEach((line, offset) => {
    const cells: SheetCells = blankCells();
    for (const column of IMPORT_COLUMNS) {
      const index = columnIndex.get(column.field);
      if (index !== undefined) cells[column.field] = cellText(line[index]);
    }
    const hasContent = Object.values(cells).some((value) => value !== "");
    if (hasContent) {
      rows.push({ rowNumber: offset + 2, cells, check: null, geo: "idle" });
    }
  });

  if (rows.length === 0) {
    throw new SheetError(
      "The sheet has no customer rows. Add at least one customer under the header row.",
    );
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    throw new SheetError(
      `This sheet has ${rows.length} customer rows. The limit is ${IMPORT_MAX_ROWS} rows per import. Split it into smaller files.`,
    );
  }
  return rows;
}
