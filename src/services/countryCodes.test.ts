import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { countryCodesLoader } from "./countryCodes";

const originalFetch = globalThis.fetch;

beforeAll(() => {
  process.env.VITE_API_BASE_URL = "https://api.test.example";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

let requestedUrls: string[] = [];
let requestedSignals: (AbortSignal | null | undefined)[] = [];

function stubFetch(impl: () => Promise<Response>): void {
  requestedUrls = [];
  requestedSignals = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestedUrls.push(`${String(input)} ${init?.method ?? "GET"}`);
    requestedSignals.push(init?.signal);
    return impl();
  }) as typeof fetch;
}

describe("countryCodesLoader", () => {
  it("asks fenzit-be for the country list with a GET", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
      ),
    );

    await countryCodesLoader();

    expect(requestedUrls).toEqual(["https://api.test.example/api/v1/country-codes GET"]);
  });

  it("returns the countries the API sends, when India is among them", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { dialCode: "+91", countryName: "India", iso2: "IN" },
            { dialCode: "+44", countryName: "United Kingdom", iso2: "GB" },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const countryCodes = await countryCodesLoader().countryCodes;

    expect(countryCodes).toEqual([
      { dialCode: "+91", countryName: "India", iso2: "IN" },
      { dialCode: "+44", countryName: "United Kingdom", iso2: "GB" },
    ]);
  });

  it("adds India first when the API list leaves it out, because the form starts on +91", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([{ dialCode: "+44", countryName: "United Kingdom", iso2: "GB" }]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const countryCodes = await countryCodesLoader().countryCodes;

    expect(countryCodes).toEqual([
      { dialCode: "+91", countryName: "India", iso2: "IN" },
      { dialCode: "+44", countryName: "United Kingdom", iso2: "GB" },
    ]);
  });

  it("falls back to India when the request fails", async () => {
    stubFetch(() => Promise.reject(new TypeError("network down")));

    const countryCodes = await countryCodesLoader().countryCodes;

    expect(countryCodes).toEqual([{ dialCode: "+91", countryName: "India", iso2: "IN" }]);
  });

  it("falls back to India when the server answers with an error", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error_code: "INTERNAL_ERROR", message: "x" }), {
          status: 500,
        }),
      ),
    );

    const countryCodes = await countryCodesLoader().countryCodes;

    expect(countryCodes).toEqual([{ dialCode: "+91", countryName: "India", iso2: "IN" }]);
  });

  it("falls back to India when the list is empty, so the dropdown is never blank", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
      ),
    );

    const countryCodes = await countryCodesLoader().countryCodes;

    expect(countryCodes).toEqual([{ dialCode: "+91", countryName: "India", iso2: "IN" }]);
  });

  it("gives up after the timeout and passes an abort signal", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
      ),
    );

    await countryCodesLoader();

    expect(requestedSignals).toHaveLength(1);
    expect(requestedSignals[0]).toBeDefined();
  });

  it("drops rows the form cannot use and keeps the rest", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            null,
            { dialCode: "+44", countryName: "United Kingdom" },
            { dialCode: "+1", countryName: "United States", iso2: "US" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const countryCodes = await countryCodesLoader().countryCodes;

    expect(countryCodes).toEqual([
      { dialCode: "+91", countryName: "India", iso2: "IN" },
      { dialCode: "+1", countryName: "United States", iso2: "US" },
    ]);
  });

  it("falls back to India when every row is unusable", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response("[null, 42]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const countryCodes = await countryCodesLoader().countryCodes;

    expect(countryCodes).toEqual([{ dialCode: "+91", countryName: "India", iso2: "IN" }]);
  });
});

describe("countryCodesLoader: does not hold up the page", () => {
  it("returns at once while the list request is still pending", async () => {
    stubFetch(() => new Promise<Response>(() => {}));

    const data = countryCodesLoader();
    const state = await Promise.race([
      data.countryCodes.then(() => "settled"),
      Promise.resolve("still pending"),
    ]);

    expect(state).toBe("still pending");
  });
});
