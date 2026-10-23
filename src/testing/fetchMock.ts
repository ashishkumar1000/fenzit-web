// Records the requests the code under test sends and answers them from one
// swappable responder, so tests assert the wire contract without mocking
// modules. Call useApiBase() in beforeAll, installFetchMock() in beforeEach,
// restoreFetchMock() in afterEach and clearApiBase() in afterAll; a test aims
// the responder with setRespond().

export type SentRequest = {
  url: string;
  method: string;
  headers: Headers;
  body: unknown;
};

const originalFetch = globalThis.fetch;

let sent: SentRequest[] = [];
let respond: (url: string) => Response | Promise<Response> = () => jsonResponse({});

/** Points apiFetch at the fake for the whole file; undo with clearApiBase(). */
export function useApiBase(): void {
  process.env.VITE_API_BASE_URL = "https://api.test.example";
}

export function clearApiBase(): void {
  delete process.env.VITE_API_BASE_URL;
}

/** Swaps in the recording fake and forgets the requests seen so far. */
export function installFetchMock(): void {
  sent = [];
  respond = () => jsonResponse({});
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    sent.push({
      url,
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return respond(url);
  }) as unknown as typeof fetch;
}

/** Puts the browser's real fetch back. */
export function restoreFetchMock(): void {
  globalThis.fetch = originalFetch;
}

/** Aims the fake at answers for the requests made until the next install. */
export function setRespond(responder: (url: string) => Response | Promise<Response>): void {
  respond = responder;
}

export function sentRequests(): SentRequest[] {
  return sent;
}

export function sentTo(path: string): SentRequest[] {
  return sent.filter((request) => request.url.endsWith(path));
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
