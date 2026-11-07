import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { clearSession, writeSession } from "../../../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
  type SentRequest,
} from "../../../testing/fetchMock";
import { useImportSheet, ADDRESS_MIN_LENGTH } from "./useImportSheet";

const COMPANY = "11111111-2222-4333-8444-555555555555";
const TWO_ROWS = "name,address,phone\nAsha,1 Park St,9876543210\nRavi,2 Lake Rd,9123456780";
const SUMMARY = { total: 2, valid: 2, invalid: 0, willUpdateExisting: 0, noMapPin: 2 };

function pathOf(url: string): string {
  return new URL(url).pathname;
}

function callsTo(suffix: string): SentRequest[] {
  return sentRequests().filter((request) => pathOf(request.url).endsWith(suffix));
}

/** A fake server: validate answers "valid" for every row, geocode answers from `geo`. */
function serve(geo: (url: URL) => Response | Promise<Response>, commitStatus = 200) {
  setRespond((url) => {
    const path = pathOf(url);
    if (path.endsWith("/validate")) {
      const rows = (sentRequests().at(-1)?.body as { rows: unknown[] }).rows;
      return jsonResponse({
        rows: rows.map((_, rowIndex) => ({
          rowIndex,
          status: "valid",
          reasons: [],
          flags: ["no_map_pin"],
          existingCustomerId: null,
        })),
        summary: SUMMARY,
      });
    }
    if (path.endsWith("/geocode")) return geo(new URL(url));
    if (path.endsWith("/commit")) {
      if (commitStatus !== 200) return jsonResponse({ error_code: "INTERNAL" }, commitStatus);
      return jsonResponse({
        batchId: "batch-1",
        rows: [
          { rowIndex: 0, status: "created", customerId: "c1", reasons: [] },
          {
            rowIndex: 1,
            status: "failed",
            customerId: null,
            reasons: [{ field: "phone", code: "X", message: "Phone already used." }],
          },
        ],
        summary: { total: 2, created: 1, updated: 0, failed: 1 },
      });
    }
    return jsonResponse({}, 404);
  });
}

async function loadTwoRows(
  hook: ReturnType<typeof useImportSheet> extends never
    ? never
    : { current: ReturnType<typeof useImportSheet> },
) {
  await act(async () => {
    await hook.current.loadFile(new File([TWO_ROWS], "sheet.csv"));
  });
  await waitFor(() => expect(hook.current.checking).toBe(false));
}

beforeAll(() => useApiBase());
afterAll(() => clearApiBase());

beforeEach(() => {
  installFetchMock();
  writeSession({ token: "staff-token", name: null });
});

afterEach(() => {
  restoreFetchMock();
  clearSession();
});

describe("fetch location", () => {
  it("fills latitude and longitude from the address parts, then re-checks the row", async () => {
    serve(() =>
      jsonResponse({
        formattedAddress: "1 Park St, Bengaluru",
        latitude: 12.9716,
        longitude: 77.5946,
      }),
    );
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    const validatesBefore = callsTo("/validate").length;
    await act(async () => {
      await hook.result.current.fetchLocation(0);
    });
    const row = hook.result.current.sheet?.rows[0];
    expect(row?.cells.latitude).toBe("12.9716");
    expect(row?.cells.longitude).toBe("77.5946");
    expect(row?.geo).toBe("found");
    expect(callsTo("/validate").length).toBe(validatesBefore + 1);
  });

  it("sends only the filled address parts to geocode", async () => {
    serve(() => jsonResponse({ formattedAddress: "x", latitude: null, longitude: null }));
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    act(() => hook.result.current.editCell(0, "pincode", "560001"));
    await act(async () => {
      await hook.result.current.fetchLocation(0);
    });
    const query = new URL(callsTo("/geocode")[0].url).searchParams;
    expect(query.get("address")).toBe("1 Park St");
    expect(query.get("pincode")).toBe("560001");
    expect(query.has("city")).toBe(false);
  });

  it("clears the coordinates and says no location was found when the answer has null coordinates", async () => {
    let answer: { latitude: number | null; longitude: number | null } = {
      latitude: 12.9,
      longitude: 77.5,
    };
    serve(() => jsonResponse({ formattedAddress: "", ...answer }));
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    await act(async () => {
      await hook.result.current.fetchLocation(0);
    });
    expect(hook.result.current.sheet?.rows[0].cells.latitude).toBe("12.9");
    answer = { latitude: null, longitude: null };
    await act(async () => {
      await hook.result.current.fetchLocation(0);
    });
    const row = hook.result.current.sheet?.rows[0];
    expect(row?.cells.latitude).toBe("");
    expect(row?.cells.longitude).toBe("");
    expect(row?.geo).toBe("not-found");
  });

  it("overwrites earlier coordinates on a repeat fetch", async () => {
    let answer = { latitude: 12.1, longitude: 77.1 };
    serve(() => jsonResponse({ formattedAddress: "", ...answer }));
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    await act(async () => {
      await hook.result.current.fetchLocation(0);
    });
    answer = { latitude: 13.5, longitude: 78.5 };
    await act(async () => {
      await hook.result.current.fetchLocation(0);
    });
    expect(hook.result.current.sheet?.rows[0].cells.latitude).toBe("13.5");
    expect(hook.result.current.sheet?.rows[0].cells.longitude).toBe("78.5");
  });

  it("sends no request for an address shorter than the minimum, and does for one at the minimum", async () => {
    serve(() => jsonResponse({ formattedAddress: "", latitude: null, longitude: null }));
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    act(() => hook.result.current.editCell(0, "address", "ab".slice(0, ADDRESS_MIN_LENGTH - 1)));
    await act(async () => {
      await hook.result.current.fetchLocation(0);
    });
    expect(callsTo("/geocode")).toHaveLength(0);
    act(() => hook.result.current.editCell(0, "address", "abc"));
    await act(async () => {
      await hook.result.current.fetchLocation(0);
    });
    expect(callsTo("/geocode")).toHaveLength(1);
  });

  it("marks only that row as failed when the lookup itself errors, and leaves its cells alone", async () => {
    serve(() => jsonResponse({ error_code: "INTERNAL" }, 500));
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    await act(async () => {
      await hook.result.current.fetchLocation(0);
    });
    expect(hook.result.current.sheet?.rows[0].geo).toBe("error");
    expect(hook.result.current.sheet?.rows[0].cells.latitude).toBe("");
    expect(hook.result.current.sheet?.rows[1].geo).toBe("idle");
  });
});

describe("submit", () => {
  it("sends every row, including ones the check marked invalid, with the file name", async () => {
    serve(() => jsonResponse({ formattedAddress: "", latitude: null, longitude: null }));
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    await act(async () => {
      await hook.result.current.submit();
    });
    const commit = callsTo("/commit")[0];
    const body = commit.body as { rows: unknown[]; fileName: string; defaultCountryCode: string };
    expect(body.rows).toHaveLength(2);
    expect(body.fileName).toBe("sheet.csv");
    expect(body.defaultCountryCode).toBe("+91");
  });

  it("reuses the key when the same sheet is sent again, so a retry replays the first answer", async () => {
    serve(() => jsonResponse({ formattedAddress: "", latitude: null, longitude: null }), 500);
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    await act(async () => {
      await hook.result.current.submit();
    });
    await act(async () => {
      await hook.result.current.submit();
    });
    const keys = callsTo("/commit").map((request) => request.headers.get("X-Idempotency-Key"));
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBeNull();
    expect(keys[1]).toBe(keys[0]);
  });

  it("drops a geocode answer that arrives after a different file was loaded", async () => {
    let release!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    serve(() => pending);
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    let fetching!: Promise<void>;
    act(() => {
      fetching = hook.result.current.fetchLocation(0);
    });
    await act(async () => {
      await hook.result.current.loadFile(new File([TWO_ROWS], "other.csv"));
    });
    await act(async () => {
      release(jsonResponse({ formattedAddress: "x", latitude: 12.97, longitude: 77.59 }));
      await fetching;
    });
    expect(hook.result.current.sheet?.fileName).toBe("other.csv");
    expect(hook.result.current.sheet?.rows[0].cells.latitude).toBe("");
    expect(hook.result.current.sheet?.rows[0].cells.longitude).toBe("");
  });

  it("uses a new key once the sheet has changed, since the server refuses a reused key with new rows", async () => {
    serve(() => jsonResponse({ formattedAddress: "", latitude: null, longitude: null }), 500);
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    await act(async () => {
      await hook.result.current.submit();
    });
    act(() => {
      hook.result.current.editCell(0, "name", "Edited Name");
    });
    await act(async () => {
      await hook.result.current.submit();
    });
    const keys = callsTo("/commit").map((request) => request.headers.get("X-Idempotency-Key"));
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("holds the server's per-row results, and a failed submit shows a plain message", async () => {
    serve(() => jsonResponse({ formattedAddress: "", latitude: null, longitude: null }));
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    await act(async () => {
      await hook.result.current.submit();
    });
    const state = hook.result.current.commit;
    expect(state.state).toBe("done");
    if (state.state === "done") {
      expect(state.result.summary).toEqual({ total: 2, created: 1, updated: 0, failed: 1 });
      expect(state.result.rows[1].status).toBe("failed");
    }
  });

  it("shows a plain message and keeps the sheet when the commit fails", async () => {
    serve(() => jsonResponse({}), 500);
    const hook = renderHook(() => useImportSheet(COMPANY));
    await loadTwoRows(hook.result);
    await act(async () => {
      await hook.result.current.submit();
    });
    expect(hook.result.current.commit).toEqual({
      state: "error",
      message: "Something went wrong on our side. Try again in a moment.",
    });
    expect(hook.result.current.sheet?.rows).toHaveLength(2);
  });
});

describe("reset", () => {
  it("clears the sheet and the commit state, and ignores a check that is still in flight", async () => {
    let release: (response: Response) => void = () => {};
    setRespond(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    const hook = renderHook(() => useImportSheet(COMPANY));
    let loading: Promise<void> = Promise.resolve();
    act(() => {
      loading = hook.result.current.loadFile(new File([TWO_ROWS], "sheet.csv"));
    });
    await waitFor(() => expect(callsTo("/validate")).toHaveLength(1));
    act(() => hook.result.current.reset());
    await act(async () => {
      release(jsonResponse({ rows: [], summary: SUMMARY }));
      await loading;
    });
    expect(hook.result.current.sheet).toBeNull();
    expect(hook.result.current.commit.state).toBe("idle");
  });
});
