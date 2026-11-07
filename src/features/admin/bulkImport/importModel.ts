/**
 * The staff customer import: column list, limits and row types. The parser,
 * the sample file, the API client and the screen all read from here, so the
 * column names live in one place. Limits match import-flow.md.
 */

export const IMPORT_MAX_ROWS = 500;
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export type ImportField =
  | "name"
  | "address"
  | "phone"
  | "latitude"
  | "longitude"
  | "city"
  | "state"
  | "pincode"
  | "addressDetails";

export type ImportColumn = {
  field: ImportField;
  /** The header text in the sheet. Matched case-insensitively. */
  header: string;
  required: boolean;
  /** Plain-English rule shown to staff on the upload screen. */
  rule: string;
};

export const IMPORT_COLUMNS: ImportColumn[] = [
  {
    field: "name",
    header: "name",
    required: true,
    rule: "Customer full name, up to 120 characters.",
  },
  {
    field: "address",
    header: "address",
    required: true,
    rule: "Street address, up to 255 characters. Used for Fetch location.",
  },
  {
    field: "phone",
    header: "phone",
    required: true,
    rule: "Mobile number, 6 to 15 digits. A dial code is optional.",
  },
  {
    field: "latitude",
    header: "latitude",
    required: false,
    rule: "Decimal degrees, -90 to 90. Needs longitude too.",
  },
  {
    field: "longitude",
    header: "longitude",
    required: false,
    rule: "Decimal degrees, -180 to 180. Needs latitude too.",
  },
  {
    field: "city",
    header: "city",
    required: false,
    rule: "Up to 100 characters. Helps Fetch location.",
  },
  {
    field: "state",
    header: "state",
    required: false,
    rule: "State or union territory, up to 100 characters. Helps Fetch location.",
  },
  {
    field: "pincode",
    header: "pincode",
    required: false,
    rule: "6-digit Indian PIN code. Helps Fetch location.",
  },
  {
    field: "addressDetails",
    header: "address_details",
    required: false,
    rule: "Flat, building, floor or landmark. Up to 255 characters.",
  },
];

/** Every cell is text while staff edit it. Blank means an empty string. */
export type SheetCells = Record<ImportField, string>;

export type RowReason = { field: string; code: string; message: string };

/** Notes the backend attaches to a row. Shown as plain text next to the row. */
export type ImportFlag = "no_map_pin" | "updates_existing" | "country_code_differs";

export type RowCheck = { status: "valid" | "invalid"; reasons: RowReason[]; flags: ImportFlag[] };

export type GeoStatus =
  "idle" | "loading" | "found" | "approximate" | "not-found" | "rate-limited" | "error";

export type SheetRow = {
  /** The spreadsheet row number: the header is row 1, so the first customer is row 2. */
  rowNumber: number;
  cells: SheetCells;
  /** The server's answer for the row's current cells, by its position in the sheet. Null until checked, or after an edit. */
  check: RowCheck | null;
  geo: GeoStatus;
};

export function blankCells(): SheetCells {
  return {
    name: "",
    address: "",
    phone: "",
    latitude: "",
    longitude: "",
    city: "",
    state: "",
    pincode: "",
    addressDetails: "",
  };
}
