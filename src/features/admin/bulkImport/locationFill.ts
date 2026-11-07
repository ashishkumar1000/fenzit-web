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

/**
 * A row is worth a lookup only when the check says it is Ready. A row that
 * needs fixing would not be saved, so it does not use a Google lookup.
 */
export function isReadyForLocation(row: SheetRow): boolean {
  return row.check?.status === "valid";
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

export type LookupOptions = {
  /** How many one-minute waits to allow on 429. A single row allows one; a run allows any number. */
  maxWaits?: number;
  /** Checked before each wait. False stops the wait, for example when the sheet was replaced. */
  keepGoing?: () => boolean;
  /** Told when the lookup starts waiting for the server limit, and when it is running again. */
  onWait?: (waiting: boolean) => void;
};

/**
 * One lookup. A 429 (the staff member's minute budget is spent) waits for the
 * window to pass and tries again, up to maxWaits times. Any other error, or a
 * 429 after the waits are used up, is thrown to the caller.
 */
export async function lookupLocation(
  companyId: string | null,
  cells: Parameters<typeof geocodeAddress>[1],
  { maxWaits = 1, keepGoing = () => true, onWait }: LookupOptions = {},
  signal?: AbortSignal,
): Promise<GeocodeResponse> {
  let waits = 0;
  for (;;) {
    try {
      const answer = await geocodeAddress(companyId, cells, signal);
      onWait?.(false);
      return answer;
    } catch (error) {
      const limited = error instanceof ApiError && error.status === 429;
      if (!limited || waits >= maxWaits || !keepGoing()) throw error;
      waits += 1;
      onWait?.(true);
      await new Promise((resolve) => setTimeout(resolve, RATE_WAIT_MS));
    }
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
