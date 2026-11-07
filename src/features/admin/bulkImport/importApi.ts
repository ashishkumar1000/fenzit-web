import { ApiError, apiFetch } from "../../../services/api";
import { readSession } from "../../../services/session";
import { companyScopedHeaders } from "../companyContext";
import { IMPORT_COLUMNS, type ImportFlag, type RowReason, type SheetRow } from "./importModel";

/**
 * Clients for the staff customer import, matched to the backend contract in
 * fenzit-be (customers/import and places/geocode). Every call is staff-only and
 * company-scoped: X-Company-Id is the company the staff member picked, and
 * companyScopedHeaders throws before any request if none is picked.
 * Row keys are the sheet's snake_case headers. Cells go out as text, blank as "".
 */

/** One sheet row as the backend reads it: sheet headers as keys, text values. */
export type RowPayload = Record<string, string>;

export type ValidateResponse = {
  rows: {
    rowIndex: number;
    status: "valid" | "invalid";
    reasons: RowReason[];
    flags: ImportFlag[];
    existingCustomerId: string | null;
  }[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    willUpdateExisting: number;
    noMapPin: number;
  };
};

export type GeocodeResponse = {
  formattedAddress: string;
  /** Both are null when no location was found. */
  latitude: number | null;
  longitude: number | null;
};

export type CommitResponse = {
  batchId: string;
  rows: {
    rowIndex: number;
    status: "created" | "updated" | "failed";
    customerId: string | null;
    reasons: RowReason[];
  }[];
  summary: { total: number; created: number; updated: number; failed: number };
};

export const IDEMPOTENCY_HEADER = "X-Idempotency-Key";

/** The sheet headers as keys (address_details, not addressDetails). */
export function toPayload(row: SheetRow): RowPayload {
  const payload: RowPayload = {};
  for (const column of IMPORT_COLUMNS) {
    payload[column.header] = row.cells[column.field];
  }
  return payload;
}

/** Headers for a staff call: the token, the picked company, and any extras. */
function staffHeaders(
  companyId: string | null,
  extra: Record<string, string> = {},
): Record<string, string> {
  const session = readSession();
  if (session === null) {
    throw new ApiError(401, "Signed out", "UNAUTHORIZED");
  }
  return {
    ...companyScopedHeaders(companyId),
    Authorization: `Bearer ${session.token}`,
    ...extra,
  };
}

const JSON_HEADERS = { "Content-Type": "application/json" };

/** Checks every row. The browser sends the whole sheet each time, so the server sees one set of rules. */
export async function validateImportRows(
  companyId: string | null,
  defaultCountryCode: string,
  rows: SheetRow[],
  signal?: AbortSignal,
): Promise<ValidateResponse> {
  return apiFetch<ValidateResponse>("/api/v1/customers/import/validate", {
    method: "POST",
    headers: staffHeaders(companyId, JSON_HEADERS),
    body: JSON.stringify({ rows: rows.map(toPayload), defaultCountryCode }),
    signal,
  });
}

/** Forward geocode for one row. Only the address parts that are filled are sent. */
export async function geocodeAddress(
  companyId: string | null,
  cells: Pick<SheetRow["cells"], "address" | "city" | "state" | "pincode">,
  signal?: AbortSignal,
): Promise<GeocodeResponse> {
  const params = new URLSearchParams();
  for (const key of ["address", "city", "state", "pincode"] as const) {
    const value = cells[key].trim();
    if (value !== "") params.set(key, value);
  }
  return apiFetch<GeocodeResponse>(`/api/v1/places/geocode?${params.toString()}`, {
    headers: staffHeaders(companyId),
    signal,
  });
}

/**
 * Saves the sheet. The key must be new for every submit click: the backend replays
 * the stored answer for any repeated key that returned 200, partial failures included.
 * Duplicates are stopped by the phone unique index and the update-only rule.
 */
export async function commitImportRows(
  companyId: string | null,
  defaultCountryCode: string,
  rows: SheetRow[],
  fileName: string,
  idempotencyKey: string,
): Promise<CommitResponse> {
  return apiFetch<CommitResponse>("/api/v1/customers/import/commit", {
    method: "POST",
    headers: staffHeaders(companyId, { ...JSON_HEADERS, [IDEMPOTENCY_HEADER]: idempotencyKey }),
    body: JSON.stringify({ rows: rows.map(toPayload), defaultCountryCode, fileName }),
  });
}
