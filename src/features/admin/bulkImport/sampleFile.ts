import writeExcelFile from "write-excel-file/browser";
import { IMPORT_COLUMNS, type ImportField } from "./importModel";

/**
 * The sample sheet, built in the browser from the column list. One example row.
 * Its phone is blank on purpose: a blank phone is an invalid row, so the example
 * cannot import by accident if staff forget to delete it.
 */
export const SAMPLE_XLSX_NAME = "fenzit-customer-sample.xlsx";
export const SAMPLE_CSV_NAME = "fenzit-customer-sample.csv";

const EXAMPLE: Record<ImportField, string> = {
  name: "EXAMPLE - delete this row",
  address: "12 MG Road",
  phone: "",
  latitude: "",
  longitude: "",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  addressDetails: "Flat 4B",
};

/** Header row, then the example row. */
export function sampleRows(): string[][] {
  return [
    IMPORT_COLUMNS.map((column) => column.header),
    IMPORT_COLUMNS.map((column) => EXAMPLE[column.field]),
  ];
}

/** CSV text for the sample. Quotes any cell with a comma, quote or line break. */
export function sampleCsvText(): string {
  return sampleRows()
    .map((row) =>
      row.map((cell) => (/[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(","),
    )
    .join("\r\n");
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari can still be reading the blob right after the click, so the URL is freed a moment later.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSampleCsv(): void {
  download(new Blob([sampleCsvText()], { type: "text/csv;charset=utf-8" }), SAMPLE_CSV_NAME);
}

export async function downloadSampleXlsx(): Promise<void> {
  const blob = await writeExcelFile(sampleRows()).toBlob();
  download(blob, SAMPLE_XLSX_NAME);
}
