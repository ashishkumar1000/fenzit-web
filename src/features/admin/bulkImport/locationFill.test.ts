import { afterEach, afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { ApiError } from "../../../services/api";
import { clearSession, writeSession } from "../../../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../../../testing/fetchMock";
import type { GeocodeResponse } from "./importApi";
import { blankCells, type SheetRow } from "./importModel";
import {
  applyLocation,
  createPacer,
  lookupLocation,
  mapWithConcurrency,
  needsLocation,
} from "./locationFill";

const COMPANY = "11111111-2222-4333-8444-555555555555";
const TOKEN = "staff-token-123";

function rowWith(
  overrides: Partial<SheetRow["cells"]> = {},
  geo: SheetRow["geo"] = "idle",
): SheetRow {
  return {
    rowNumber: 2,
    cells: {
      ...blankCells(),
      name: "Asha",
      address: "1 Park St",
      phone: "9876543210",
      ...overrides,
    },
    check: null,
    geo,
  };
}

const FOUND: GeocodeResponse = {
  formattedAddress: "Madhepur, Bihar 847408, India",
  latitude: 26.1755791,
  longitude: 86.38009559999999,
  approximate: true,
  city: "Madhepur",
  state: "Bihar",
  pincode: "847408",
};
const NOT_FOUND: GeocodeResponse = {
  formattedAddress: null,
  latitude: null,
  longitude: null,
  approximate: false,
  city: null,
  state: null,
  pincode: null,
};

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

beforeEach(() => {
  installFetchMock();
  writeSession({ token: TOKEN, name: null });
});

afterEach(() => {
  restoreFetchMock();
  clearSession();
});

describe("needsLocation", () => {
  it("is true for an address with no coordinates yet", () => {
    expect(needsLocation(rowWith())).toBe(true);
  });

  it("is false when the row already has a latitude or a longitude", () => {
    expect(needsLocation(rowWith({ latitude: "26.1" }))).toBe(false);
    expect(needsLocation(rowWith({ longitude: "86.3" }))).toBe(false);
  });

  it("is false for an address shorter than the minimum, or blank", () => {
    expect(needsLocation(rowWith({ address: "ab" }))).toBe(false);
    expect(needsLocation(rowWith({ address: "   " }))).toBe(false);
  });

  it("is false while the row's own lookup is still running", () => {
    expect(needsLocation(rowWith({}, "loading"))).toBe(false);
  });

  it("treats a whitespace-only coordinate as blank", () => {
    expect(needsLocation(rowWith({ latitude: "   ", longitude: "  " }))).toBe(true);
  });
});

describe("mapWithConcurrency", () => {
  it("never has more items in flight than the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const seen: number[] = [];
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (item) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      seen.push(item);
      inFlight -= 1;
    });
    expect(peak).toBe(3);
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("does nothing for an empty list", async () => {
    let calls = 0;
    await mapWithConcurrency([], 3, async () => {
      calls += 1;
    });
    expect(calls).toBe(0);
  });

  it("runs every item once when the limit is larger than the list", async () => {
    const seen: string[] = [];
    await mapWithConcurrency(["a", "b"], 10, async (item) => {
      seen.push(item);
    });
    expect(seen.sort()).toEqual(["a", "b"]);
  });
});

describe("createPacer", () => {
  it("lets callers through no closer together than the gap, in the order they asked", async () => {
    const pace = createPacer(40);
    const starts: number[] = [];
    await Promise.all(
      [1, 2, 3].map(async (n) => {
        await pace();
        starts.push(n);
      }),
    );
    expect(starts).toEqual([1, 2, 3]);
  });

  it("spaces the starts by at least the gap", async () => {
    const pace = createPacer(40);
    const times: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      await pace();
      times.push(Date.now());
    }
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(35);
    expect(times[2] - times[1]).toBeGreaterThanOrEqual(35);
  });
});

describe("applyLocation", () => {
  it("writes the coordinates and fills every blank address part", () => {
    const next = applyLocation(rowWith(), FOUND);
    expect(next.cells.latitude).toBe("26.1755791");
    expect(next.cells.longitude).toBe("86.38009559999999");
    expect(next.cells.city).toBe("Madhepur");
    expect(next.cells.state).toBe("Bihar");
    expect(next.cells.pincode).toBe("847408");
    expect(next.cells.addressDetails).toBe("Madhepur, Bihar 847408, India");
    expect(next.geo).toBe("approximate");
    expect(next.check).toBeNull();
  });

  it("keeps any part the staff member already typed", () => {
    const next = applyLocation(
      rowWith({ city: "Patna", pincode: "800001", addressDetails: "Flat 4" }),
      FOUND,
    );
    expect(next.cells.city).toBe("Patna");
    expect(next.cells.pincode).toBe("800001");
    expect(next.cells.addressDetails).toBe("Flat 4");
    expect(next.cells.state).toBe("Bihar");
  });

  it("marks a precise match as found, not approximate", () => {
    const next = applyLocation(rowWith(), { ...FOUND, approximate: false });
    expect(next.geo).toBe("found");
  });

  it("clears the coordinates and reports not-found when nothing matched", () => {
    const next = applyLocation(
      rowWith({ latitude: "26.1", longitude: "86.3", city: "Patna" }),
      NOT_FOUND,
    );
    expect(next.cells.latitude).toBe("");
    expect(next.cells.longitude).toBe("");
    expect(next.cells.city).toBe("Patna");
    expect(next.cells.addressDetails).toBe("");
    expect(next.geo).toBe("not-found");
  });

  it("leaves a part the match does not give blank, not filled with nothing", () => {
    const next = applyLocation(rowWith(), { ...FOUND, city: null, pincode: null });
    expect(next.cells.city).toBe("");
    expect(next.cells.pincode).toBe("");
    expect(next.cells.state).toBe("Bihar");
  });
});

describe("lookupLocation", () => {
  // The 60-second wait after a 429 is stubbed out so the test runs at once.
  const realSetTimeout = globalThis.setTimeout;
  beforeEach(() => {
    globalThis.setTimeout = ((callback: () => void) => {
      callback();
      return 0;
    }) as unknown as typeof setTimeout;
  });
  afterEach(() => {
    globalThis.setTimeout = realSetTimeout;
  });

  const cells = { ...blankCells(), address: "MADHEPUR", state: "Bihar" };

  it("returns the answer when the first lookup succeeds, with one request", async () => {
    setRespond(() => jsonResponse(FOUND));
    const answer = await lookupLocation(COMPANY, cells);
    expect(answer).toEqual(FOUND);
    expect(sentRequests()).toHaveLength(1);
  });

  it("waits and tries once more after a 429, then returns the answer", async () => {
    let calls = 0;
    setRespond(() => {
      calls += 1;
      return calls === 1 ? jsonResponse({ error_code: "RATE_LIMITED" }, 429) : jsonResponse(FOUND);
    });
    const answer = await lookupLocation(COMPANY, cells);
    expect(answer).toEqual(FOUND);
    expect(sentRequests()).toHaveLength(2);
  });

  it("keeps waiting through repeated 429s in a run until the lookup succeeds", async () => {
    let calls = 0;
    setRespond(() => {
      calls += 1;
      return calls <= 3 ? jsonResponse({ error_code: "RATE_LIMITED" }, 429) : jsonResponse(FOUND);
    });
    const waiting: boolean[] = [];
    const answer = await lookupLocation(COMPANY, cells, {
      maxWaits: Number.POSITIVE_INFINITY,
      onWait: (value) => waiting.push(value),
    });
    expect(answer).toEqual(FOUND);
    expect(sentRequests()).toHaveLength(4);
    expect(waiting).toEqual([true, true, true, false]);
  });

  it("stops waiting when the run is no longer wanted, and reports the 429", async () => {
    setRespond(() => jsonResponse({ error_code: "RATE_LIMITED" }, 429));
    await expect(
      lookupLocation(COMPANY, cells, {
        maxWaits: Number.POSITIVE_INFINITY,
        keepGoing: () => false,
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(sentRequests()).toHaveLength(1);
  });

  it("gives up after one retry when the 429 comes back", async () => {
    setRespond(() => jsonResponse({ error_code: "RATE_LIMITED" }, 429));
    await expect(lookupLocation(COMPANY, cells)).rejects.toBeInstanceOf(ApiError);
    expect(sentRequests()).toHaveLength(2);
  });

  it("does not retry any other error", async () => {
    setRespond(() => jsonResponse({ error_code: "VALIDATION_ERROR" }, 422));
    await expect(lookupLocation(COMPANY, cells)).rejects.toBeInstanceOf(ApiError);
    expect(sentRequests()).toHaveLength(1);
  });
});
