import { afterEach, beforeAll, beforeEach, afterAll, describe, expect, it } from "bun:test";
import { ApiError, NoCompanySelectedError } from "../../../services/api";
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
import {
  commitImportRows,
  geocodeAddress,
  IDEMPOTENCY_HEADER,
  toPayload,
  validateImportRows,
} from "./importApi";
import { blankCells, type SheetRow } from "./importModel";

const COMPANY = "11111111-2222-4333-8444-555555555555";
const TOKEN = "staff-token-123";

function headerOf(request: SentRequest, name: string): string | null {
  return request.headers.get(name);
}

/** The parsed JSON body of the nth request this test sent. */
function bodyOf(index: number): Record<string, unknown> {
  return sentRequests()[index].body as Record<string, unknown>;
}

function row(overrides: Partial<SheetRow["cells"]> = {}, rowNumber = 2): SheetRow {
  return {
    rowNumber,
    cells: {
      ...blankCells(),
      name: "Asha",
      address: "1 Park St",
      phone: "9876543210",
      ...overrides,
    },
    check: null,
    geo: "idle",
  };
}

const EMPTY_SUMMARY = { total: 0, valid: 0, invalid: 0, willUpdateExisting: 0, noMapPin: 0 };

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

describe("toPayload: the keys the backend reads", () => {
  it("uses sheet headers as keys, so address_details replaces addressDetails", () => {
    const payload = toPayload(row({ addressDetails: "Flat 4B" }));
    expect(Object.keys(payload).sort()).toEqual(
      [
        "name",
        "address",
        "phone",
        "latitude",
        "longitude",
        "city",
        "state",
        "pincode",
        "address_details",
      ].sort(),
    );
    expect(payload.address_details).toBe("Flat 4B");
    expect("addressDetails" in payload).toBe(false);
  });

  it("sends numbers-as-text and blanks as empty strings, never null", () => {
    const payload = toPayload(row({ latitude: "12.9716", longitude: "" }));
    expect(payload.latitude).toBe("12.9716");
    expect(payload.longitude).toBe("");
    expect(Object.values(payload).every((value) => typeof value === "string")).toBe(true);
  });

  it("keeps Devanagari text exactly as typed", () => {
    expect(toPayload(row({ name: "सीता देवी" })).name).toBe("सीता देवी");
  });
});

describe("validateImportRows: request", () => {
  it("posts the rows and the dial code as defaultCountryCode, with the staff headers", async () => {
    setRespond(() => jsonResponse({ rows: [], summary: EMPTY_SUMMARY }));
    await validateImportRows(COMPANY, "+91", [row()]);
    const [call] = sentRequests();
    expect(call.url).toContain("/api/v1/customers/import/validate");
    expect(call.method).toBe("POST");
    expect(headerOf(call, "X-Company-Id")).toBe(COMPANY);
    expect(headerOf(call, "Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(headerOf(call, "Content-Type")).toBe("application/json");
    const body = call.body as Record<string, unknown>;
    expect(body.defaultCountryCode).toBe("+91");
    expect("defaultDialCode" in body).toBe(false);
    expect(body.rows).toHaveLength(1);
  });

  it("sends an empty rows list as a list, not as a missing field", async () => {
    setRespond(() => jsonResponse({ rows: [], summary: EMPTY_SUMMARY }));
    await validateImportRows(COMPANY, "+91", []);
    expect(bodyOf(0).rows).toEqual([]);
  });

  it("sends nothing and throws when no company is picked", async () => {
    setRespond(() => jsonResponse({}));
    await expect(validateImportRows(null, "+91", [row()])).rejects.toBeInstanceOf(
      NoCompanySelectedError,
    );
    expect(sentRequests()).toHaveLength(0);
  });

  it("sends nothing and throws a sign-in error when no session is stored", async () => {
    clearSession();
    setRespond(() => jsonResponse({}));
    let caught: unknown = null;
    try {
      await validateImportRows(COMPANY, "+91", [row()]);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).errorCode).toBe("UNAUTHORIZED");
    expect(sentRequests()).toHaveLength(0);
  });

  it("turns a 403 from the backend into an ApiError carrying the error code", async () => {
    setRespond(() => jsonResponse({ error_code: "FORBIDDEN", message: "no" }, 403));
    let caught: unknown = null;
    try {
      await validateImportRows(COMPANY, "+91", [row()]);
    } catch (error) {
      caught = error;
    }
    expect((caught as ApiError).status).toBe(403);
    expect((caught as ApiError).errorCode).toBe("FORBIDDEN");
  });
});

describe("geocodeAddress: query", () => {
  it("sends only the address parts that are filled", async () => {
    setRespond(() => jsonResponse({ formattedAddress: "x", latitude: 1, longitude: 2 }));
    await geocodeAddress(COMPANY, {
      name: "",
      address: "1 Park St",
      city: "",
      state: "  ",
      pincode: "560001",
    });
    const url = new URL(sentRequests()[0].url);
    expect(url.pathname).toBe("/api/v1/places/geocode");
    expect(url.searchParams.get("address")).toBe("1 Park St");
    expect(url.searchParams.get("pincode")).toBe("560001");
    expect(url.searchParams.has("city")).toBe(false);
    expect(url.searchParams.has("state")).toBe(false);
  });

  it("sends the customer name with the address", async () => {
    setRespond(() => jsonResponse({ formattedAddress: "x", latitude: null, longitude: null }));
    await geocodeAddress(COMPANY, {
      name: "Ravi Kumar",
      address: "1 Park St",
      city: "",
      state: "",
      pincode: "",
    });
    expect(new URL(sentRequests()[0].url).searchParams.get("name")).toBe("Ravi Kumar");
  });

  it("trims the parts and encodes special characters", async () => {
    setRespond(() => jsonResponse({ formattedAddress: "x", latitude: null, longitude: null }));
    await geocodeAddress(COMPANY, {
      name: "",
      address: "  Flat 2 & 3, MG Road  ",
      city: "",
      state: "",
      pincode: "",
    });
    expect(new URL(sentRequests()[0].url).searchParams.get("address")).toBe("Flat 2 & 3, MG Road");
  });

  it("sends the company header and the staff token", async () => {
    setRespond(() => jsonResponse({ formattedAddress: "x", latitude: null, longitude: null }));
    await geocodeAddress(COMPANY, {
      name: "",
      address: "1 Park St",
      city: "",
      state: "",
      pincode: "",
    });
    expect(headerOf(sentRequests()[0], "X-Company-Id")).toBe(COMPANY);
    expect(headerOf(sentRequests()[0], "Authorization")).toBe(`Bearer ${TOKEN}`);
  });
});

describe("commitImportRows: request", () => {
  it("sends the idempotency key it was given, as the header", async () => {
    setRespond(() =>
      jsonResponse({
        batchId: "b",
        rows: [],
        summary: { total: 0, created: 0, updated: 0, failed: 0 },
      }),
    );
    await commitImportRows(COMPANY, "+91", [row()], "sheet.csv", "key-abc");
    expect(headerOf(sentRequests()[0], IDEMPOTENCY_HEADER)).toBe("key-abc");
  });

  it("sends the file name and dial code in the body, and all the rows it was given", async () => {
    setRespond(() =>
      jsonResponse({
        batchId: "b",
        rows: [],
        summary: { total: 2, created: 0, updated: 0, failed: 0 },
      }),
    );
    await commitImportRows(
      COMPANY,
      "+1",
      [row({}, 2), row({ phone: "" }, 3)],
      "customers.xlsx",
      "k",
    );
    const body = bodyOf(0);
    expect(body.fileName).toBe("customers.xlsx");
    expect(body.defaultCountryCode).toBe("+1");
    expect(body.rows).toHaveLength(2);
  });

  it("accepts a file name at the 255-character limit as it is", async () => {
    setRespond(() =>
      jsonResponse({
        batchId: "b",
        rows: [],
        summary: { total: 0, created: 0, updated: 0, failed: 0 },
      }),
    );
    const longName = `${"a".repeat(251)}.csv`;
    await commitImportRows(COMPANY, "+91", [row()], longName, "k");
    expect(bodyOf(0).fileName).toBe(longName);
  });
});
