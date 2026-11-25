import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { writeSession } from "../../../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../../../testing/fetchMock";
import { ExportCustomersButton } from "./CustomersExport";

// The Download list control builds the whole book's CSV in the browser: every
// page of /customers/page, not just the one on screen, with the UTF-8
// byte-order mark so Excel reads accents right, formula-triggering free text
// neutralized, and the phone one quoted cell ("+91 9900000002").

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

let savedBlob: Blob | null = null;
let createObjectUrlCalls = 0;

beforeEach(() => {
  savedBlob = null;
  createObjectUrlCalls = 0;
  installFetchMock();
  setRespond(respondDefault);
  // happy-dom cannot resolve a blob: URL — the stub captures the blob the
  // builder made and answers without navigating.
  URL.createObjectURL = ((blob: Blob) => {
    savedBlob = blob;
    createObjectUrlCalls += 1;
    return "blob:stub";
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
});

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  cleanup();
});

function customerRow(n: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `c-${n}`,
    name: `Sharma General Store ${n}`,
    customerCode: `CST-${String(n).padStart(3, "0")}`,
    countryCode: "+91",
    phoneNumber: `99000000${String(n).padStart(2, "0")}`,
    address: `${n} Nehru Road`,
    city: "Delhi",
    jobCount: n,
    lastJobDate: "2026-11-15T09:30:00Z",
    ...overrides,
  };
}

function respondDefault(url: string): Response {
  if (url.includes("/customers/page")) {
    return jsonResponse({
      data: [
        customerRow(1, { name: "Sharma General Store", address: "12 Nehru Road", jobCount: 4 }),
        customerRow(2, {
          name: "=Weird Traders",
          customerCode: "CST-002",
          phoneNumber: "9811100011",
          address: null,
          city: null,
          jobCount: 0,
          lastJobDate: null,
        }),
      ],
      total: 2,
      page: 1,
      pageSize: 100,
      pages: 1,
      stats: { total: 2, new: 1, single: 0, repeat: 1 },
    });
  }
  throw new TypeError(`offline in tests: ${url}`);
}

describe("CustomersExport: the whole-book CSV walk", () => {
  it("writes the byte-order mark, the exact header and a row per customer", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const { getByRole } = render(<ExportCustomersButton />);
    fireEvent.click(getByRole("button", { name: "Download Customer List" }));
    await waitFor(() => expect(createObjectUrlCalls).toBe(1));
    expect(sentRequests().filter((r) => r.url.includes("/customers/page")).length).toBe(1);
    const text = await (savedBlob as unknown as Blob).text();
    // The byte-order mark rides the first cell, before the header.
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.slice(1).split("\n");
    expect(lines.length).toBe(3); // header + 2 rows
    expect(lines[0]).toBe("Name,Phone,Code,Address,City,Jobs,Last Job Date");
    // The stamp is the screen's two India-time lines joined; the Jobs count
    // stays a bare number, never a quoted cell.
    expect(lines[1]).toBe(
      '"Sharma General Store","+91 9900000001","CST-001","12 Nehru Road","Delhi",4,"Nov 15, 2026 3:00 PM"',
    );
  });

  it("guards formula-triggering names and writes blank cells for the missing extras", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const { getByRole } = render(<ExportCustomersButton />);
    fireEvent.click(getByRole("button", { name: "Download Customer List" }));
    await waitFor(() => expect(createObjectUrlCalls).toBe(1));
    const text = await (savedBlob as unknown as Blob).text();
    // The leading = gets a quote-prefix so the spreadsheet reads it as text.
    expect(text).toContain('"\'=Weird Traders"');
    // No address, no city, no last job — the cells empty, the count bare.
    expect(text.endsWith('"\'=Weird Traders","+91 9811100011","CST-002","","",0,""')).toBe(true);
  });

  it("says the file could not be built when the page fails", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    setRespond((url) =>
      url.includes("/customers/page") ? jsonResponse({}, 500) : respondDefault(url),
    );
    const { getByRole, findByRole } = render(<ExportCustomersButton />);
    fireEvent.click(getByRole("button", { name: "Download Customer List" }));
    expect(await findByRole("alert")).toHaveTextContent(
      "We could not create the file. Please try again.",
    );
    expect(createObjectUrlCalls).toBe(0);
  });
});
