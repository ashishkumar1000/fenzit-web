import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { NoCompanySelectedError } from "../../../services/api";
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
import { useImportSheet } from "./useImportSheet";

const COMPANY = "11111111-2222-4333-8444-555555555555";
const TOKEN = "staff-token-123";
const CSV_TWO_ROWS = "name,address,phone\nAsha,1 Park St,9876543210\nRavi,2 Lake Rd,9123456780";

type Status = "valid" | "invalid";

/** Answers a validate request with one row per sent row, using the given statuses by position. */
function validateAnswer(statuses: Status[]) {
  return {
    rows: statuses.map((status, rowIndex) => ({
      rowIndex,
      status,
      normalised: null,
      reasons:
        status === "invalid"
          ? [{ field: "phone", code: "PHONE_INVALID", message: "Phone is not valid." }]
          : [],
      flags: status === "valid" ? ["no_map_pin"] : [],
      existingCustomerId: null,
    })),
    summary: { total: statuses.length, valid: 0, invalid: 0, willUpdateExisting: 0, noMapPin: 0 },
  };
}

function lastBody(): Record<string, unknown> {
  return sentRequests().at(-1)?.body as Record<string, unknown>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function csvFile(text: string, name = "sheet.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

function pathOf(url: string): string {
  return new URL(url).pathname;
}

beforeAll(() => useApiBase());
afterAll(() => clearApiBase());

beforeEach(() => {
  installFetchMock();
  writeSession({ token: TOKEN, name: null });
});

afterEach(() => {
  restoreFetchMock();
  clearSession();
});

describe("loading a file and applying the check", () => {
  it("sends the sheet to validate once and applies each answer to the row at the same position", async () => {
    setRespond((url) => {
      if (pathOf(url).endsWith("/validate")) {
        return jsonResponse(validateAnswer(["valid", "invalid"]));
      }
      return jsonResponse({}, 404);
    });
    const { result } = renderHook(() => useImportSheet(COMPANY));
    await act(async () => {
      await result.current.loadFile(csvFile(CSV_TWO_ROWS));
    });
    await waitFor(() => expect(result.current.checking).toBe(false));
    const validateCalls = sentRequests().filter((request) => request.url.endsWith("/validate"));
    expect(validateCalls).toHaveLength(1);
    expect((validateCalls[0].body as { rows: unknown[] }).rows).toHaveLength(2);
    const rows = result.current.sheet?.rows ?? [];
    expect(rows[0].check?.status).toBe("valid");
    expect(rows[0].check?.flags).toEqual(["no_map_pin"]);
    expect(rows[1].check?.status).toBe("invalid");
    expect(rows[1].check?.reasons[0].message).toBe("Phone is not valid.");
  });

  it("shows a read error and no rows for a file it cannot use, and sends nothing", async () => {
    setRespond(() => jsonResponse({}));
    const { result } = renderHook(() => useImportSheet(COMPANY));
    await act(async () => {
      await result.current.loadFile(new File(["x"], "sheet.pdf"));
    });
    expect(result.current.readError).toMatch(/not supported/);
    expect(result.current.sheet).toBeNull();
    expect(sentRequests()).toHaveLength(0);
    expect(result.current.reading).toBe(false);
  });

  it("shows the check error in plain English when no company is picked", async () => {
    setRespond(() => jsonResponse({}));
    const { result } = renderHook(() => useImportSheet(null));
    await act(async () => {
      await result.current.loadFile(csvFile(CSV_TWO_ROWS));
    });
    expect(result.current.checkError).toMatch(/Pick a company first/);
    expect(sentRequests()).toHaveLength(0);
    expect(new NoCompanySelectedError().message).toBe("No company selected");
  });

  it("keeps the rows on screen and offers a retry when the check fails on the server", async () => {
    let fail = true;
    setRespond(() => {
      if (fail) return jsonResponse({ error_code: "INTERNAL" }, 500);
      return jsonResponse(validateAnswer(["valid", "valid"]));
    });
    const { result } = renderHook(() => useImportSheet(COMPANY));
    await act(async () => {
      await result.current.loadFile(csvFile(CSV_TWO_ROWS));
    });
    await waitFor(() => expect(result.current.checkError).not.toBeNull());
    expect(result.current.checkError).toBe(
      "Something went wrong on our side. Try again in a moment.",
    );
    expect(result.current.sheet?.rows).toHaveLength(2);
    fail = false;
    await act(async () => {
      result.current.retryCheck();
    });
    await waitFor(() => expect(result.current.checkError).toBeNull());
    expect(result.current.sheet?.rows[1].check?.status).toBe("valid");
  });
});

describe("editing cells and re-checking", () => {
  it("clears only the edited row's check, so the other row keeps its answer", async () => {
    setRespond(() => jsonResponse(validateAnswer(["valid", "valid"])));
    const { result } = renderHook(() => useImportSheet(COMPANY));
    await act(async () => {
      await result.current.loadFile(csvFile(CSV_TWO_ROWS));
    });
    act(() => result.current.editCell(0, "phone", ""));
    const rows = result.current.sheet?.rows ?? [];
    expect(rows[0].check).toBeNull();
    expect(rows[0].cells.phone).toBe("");
    expect(rows[1].check?.status).toBe("valid");
  });

  it("re-checks on blur only when some row has changed since the last check", async () => {
    setRespond(() => jsonResponse(validateAnswer(["valid", "valid"])));
    const { result } = renderHook(() => useImportSheet(COMPANY));
    await act(async () => {
      await result.current.loadFile(csvFile(CSV_TWO_ROWS));
    });
    const before = sentRequests().length;
    act(() => result.current.recheckIfNeeded());
    expect(sentRequests().length).toBe(before);
    act(() => result.current.editCell(1, "name", "Ravi K"));
    act(() => result.current.recheckIfNeeded());
    await waitFor(() => expect(sentRequests().length).toBe(before + 1));
    expect((lastBody().rows as Array<Record<string, string>>)[1].name).toBe("Ravi K");
  });

  it("drops an answer that arrives after its row was edited, so stale results never show", async () => {
    const slow = deferred<Response>();
    let calls = 0;
    setRespond(() => {
      calls += 1;
      if (calls === 1) return slow.promise;
      return jsonResponse(validateAnswer(["valid", "valid"]));
    });
    const { result } = renderHook(() => useImportSheet(COMPANY));
    let loading: Promise<void> = Promise.resolve();
    act(() => {
      loading = result.current.loadFile(csvFile(CSV_TWO_ROWS));
    });
    await waitFor(() => expect(calls).toBe(1));
    act(() => result.current.editCell(0, "phone", "1234"));
    await act(async () => {
      slow.resolve(jsonResponse(validateAnswer(["invalid", "valid"])));
      await loading;
    });
    expect(result.current.sheet?.rows[0].check).toBeNull();
    expect(result.current.sheet?.rows[1].check?.status).toBe("valid");
  });

  it("applies only the newest of two overlapping checks, even when the older one returns last", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    let calls = 0;
    setRespond(() => {
      calls += 1;
      return calls === 1 ? first.promise : second.promise;
    });
    const { result } = renderHook(() => useImportSheet(COMPANY));
    let loading: Promise<void> = Promise.resolve();
    act(() => {
      loading = result.current.loadFile(csvFile(CSV_TWO_ROWS));
    });
    await waitFor(() => expect(calls).toBe(1));
    act(() => result.current.setDialCode("+1"));
    await waitFor(() => expect(calls).toBe(2));
    await act(async () => {
      second.resolve(jsonResponse(validateAnswer(["valid", "valid"])));
      await Promise.resolve();
    });
    await act(async () => {
      first.resolve(jsonResponse(validateAnswer(["invalid", "invalid"])));
      await loading;
    });
    expect(result.current.sheet?.rows.map((row) => row.check?.status)).toEqual(["valid", "valid"]);
  });

  it("sends the new dial code as defaultCountryCode when the sheet's country changes", async () => {
    setRespond(() => jsonResponse(validateAnswer(["valid", "valid"])));
    const { result } = renderHook(() => useImportSheet(COMPANY));
    await act(async () => {
      await result.current.loadFile(csvFile(CSV_TWO_ROWS));
    });
    expect(lastBody().defaultCountryCode).toBe("+91");
    await act(async () => {
      result.current.setDialCode("+1");
    });
    await waitFor(() => expect(lastBody().defaultCountryCode).toBe("+1"));
  });
});
