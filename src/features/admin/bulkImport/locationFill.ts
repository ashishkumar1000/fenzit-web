import { ApiError } from "../../../services/api";
import { ADDRESS_MIN_LENGTH } from "./addressRules";
import { geocodeAddress, type GeocodeResponse } from "./importApi";
import type { SheetRow } from "./importModel";

/** Lookups in flight at once for "Fetch all". Keeps the server from taking a burst. */
export const LOCATION_CONCURRENCY = 3;
/** The server's geocode limit window is one minute. A 429 waits for it to pass. */
const RATE_WAIT_MS = 60_000;
/**
 * Gap between the starts of two lookups in one run: about 55 a minute, under
 * the server's 60-a-minute limit. A 300-row sheet then takes about 5.5 minutes
 * instead of tripping the limit after the first 60 rows.
 */
export const LOOKUP_GAP_MS = 1100;

/**
 * Returns a gate that lets one caller through at a time, at least gapMs after
 * the previous start. Callers queue in the order they ask.
 */
export function createPacer(gapMs: number): () => Promise<void> {
  let last = Number.NEGATIVE_INFINITY;
  let chain: Promise<void> = Promise.resolve();
  return () => {
    chain = chain.then(async () => {
      const wait = last + gapMs - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      last = Date.now();
    });
    return chain;
  };
}

/** Blank cells fill from a lookup. Text the staff member typed is never replaced. */
export function blankThenFill(current: string, found: string | null): string {
  return current.trim() === "" && found ? found : current;
}

/** A row can be looked up when it has an address and no coordinates yet. */
export function needsLocation(row: SheetRow): boolean {
  return (
    row.geo !== "loading" &&
    row.cells.address.trim().length >= ADDRESS_MIN_LENGTH &&
    row.cells.latitude.trim() === "" &&
    row.cells.longitude.trim() === ""
  );
}

/**
 * Runs the worker over the items with at most `limit` in flight. A worker must
 * not throw: a failed row is marked on the row, not raised here.
 */
export async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

/**
 * One lookup. A 429 (the staff member's minute budget is spent) waits for the
 * window to pass and tries once more. Any other error is thrown to the caller.
 */
export async function lookupLocation(
  companyId: string | null,
  cells: Parameters<typeof geocodeAddress>[1],
  signal?: AbortSignal,
): Promise<GeocodeResponse> {
  try {
    return await geocodeAddress(companyId, cells, signal);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 429) throw error;
    await new Promise((resolve) => setTimeout(resolve, RATE_WAIT_MS));
    return geocodeAddress(companyId, cells, signal);
  }
}

/** Writes a lookup answer onto a row. Coordinates are cleared when nothing was found. */
export function applyLocation(item: SheetRow, answer: GeocodeResponse): SheetRow {
  const found = answer.latitude !== null && answer.longitude !== null;
  return {
    ...item,
    cells: {
      ...item.cells,
      latitude: found ? String(answer.latitude) : "",
      longitude: found ? String(answer.longitude) : "",
      // Address parts only fill blank cells: text the staff member typed is kept.
      city: blankThenFill(item.cells.city, answer.city),
      state: blankThenFill(item.cells.state, answer.state),
      pincode: blankThenFill(item.cells.pincode, answer.pincode),
      // The matched address fills the extra address line only when it is empty.
      addressDetails: found
        ? blankThenFill(item.cells.addressDetails, answer.formattedAddress)
        : item.cells.addressDetails,
    },
    geo: found ? (answer.approximate ? "approximate" : "found") : "not-found",
    check: null,
  };
}
