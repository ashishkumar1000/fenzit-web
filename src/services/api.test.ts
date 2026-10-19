import { describe, expect, it } from "bun:test";
import { ApiError, createApiFetch } from "./api";

const BASE = "https://api.test";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientWith(
  fetchImpl: (url: string, init: RequestInit) => Promise<Response>,
  timeoutMs?: number,
) {
  return createApiFetch({
    resolveBaseUrl: () => BASE,
    fetchImpl,
    timeoutMs,
  });
}

/** Rejects with the abort reason once the request's signal fires, like a stalled fetch. */
function stalledFetch(_url: string, init: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });
}

describe("apiFetch: request shape", () => {
  it("joins the base URL and the path", async () => {
    const urls: string[] = [];
    const apiFetch = clientWith(async (url) => {
      urls.push(url);
      return jsonResponse({ ok: true });
    });

    await apiFetch("/api/v1/jobs");

    expect(urls).toEqual([`${BASE}/api/v1/jobs`]);
  });

  it("sends Accept: application/json by default", async () => {
    let sent: Headers | undefined;
    const apiFetch = clientWith(async (_url, init) => {
      sent = new Headers(init.headers);
      return jsonResponse({});
    });

    await apiFetch("/x");

    expect(sent?.get("accept")).toBe("application/json");
  });

  it("keeps caller headers such as Authorization next to Accept", async () => {
    let sent: Headers | undefined;
    const apiFetch = clientWith(async (_url, init) => {
      sent = new Headers(init.headers);
      return jsonResponse({});
    });

    await apiFetch("/x", { headers: { Authorization: "Bearer abc" } });

    expect(sent?.get("authorization")).toBe("Bearer abc");
    expect(sent?.get("accept")).toBe("application/json");
  });
});

describe("apiFetch: successful responses", () => {
  it("returns the parsed JSON body", async () => {
    const apiFetch = clientWith(async () => jsonResponse({ id: 7 }));

    expect(await apiFetch<{ id: number }>("/x")).toEqual({ id: 7 });
  });

  it("returns undefined for 204 No Content", async () => {
    const apiFetch = clientWith(async () => new Response(null, { status: 204 }));

    expect(await apiFetch("/x")).toBeUndefined();
  });

  it("throws an ApiError for a 200 with an empty body, because a JSON endpoint must answer with JSON", async () => {
    const apiFetch = clientWith(async () => new Response("", { status: 200 }));

    const error = await apiFetch("/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(200);
  });

  it("throws an ApiError, not a raw SyntaxError, for a 200 with a body that is not JSON", async () => {
    const apiFetch = clientWith(async () => new Response("<html>oops</html>", { status: 200 }));

    const error = await apiFetch("/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(200);
    expect((error as ApiError).message).toMatch(/could not read/i);
  });
});

describe("apiFetch: error responses", () => {
  it("maps an error body's error_code onto the ApiError", async () => {
    const apiFetch = clientWith(async () =>
      jsonResponse({ error_code: "INVALID_OTP", message: "Wrong code" }, 401),
    );

    const error = (await apiFetch("/x").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.errorCode).toBe("INVALID_OTP");
  });

  it("leaves errorCode undefined when the error body has no error_code", async () => {
    const apiFetch = clientWith(async () => jsonResponse({ message: "nope" }, 500));

    const error = (await apiFetch("/x").catch((e: unknown) => e)) as ApiError;

    expect(error.status).toBe(500);
    expect(error.errorCode).toBeUndefined();
  });

  it("does not treat a non-string error_code as a code", async () => {
    const apiFetch = clientWith(async () => jsonResponse({ error_code: 42 }, 422));

    const error = (await apiFetch("/x").catch((e: unknown) => e)) as ApiError;

    expect(error.errorCode).toBeUndefined();
  });

  it("still throws the status when the error body is not JSON", async () => {
    const apiFetch = clientWith(async () => new Response("Bad Gateway", { status: 502 }));

    const error = (await apiFetch("/x").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.errorCode).toBeUndefined();
  });

  it("does not return the body of an error response as data", async () => {
    const apiFetch = clientWith(async () => jsonResponse({ id: 1, error_code: "X" }, 404));

    await expect(apiFetch("/x")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("apiFetch: no response reached the client", () => {
  it("turns a network rejection into an ApiError with status 0", async () => {
    const apiFetch = clientWith(async () => {
      throw new TypeError("Failed to fetch");
    });

    const error = (await apiFetch("/x").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/could not reach the server/i);
  });

  it("gives up after the timeout and reports it as a timeout, not a network error", async () => {
    const apiFetch = clientWith(stalledFetch, 10);

    const error = (await apiFetch("/x").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/took too long/i);
  });

  it("times out a body that never finishes arriving", async () => {
    // A real fetch errors its body stream when the signal aborts. The stub does the same.
    const apiFetch = clientWith(async (_url, init) => {
      const body = new ReadableStream({
        start(controller) {
          init.signal?.addEventListener("abort", () =>
            controller.error(new DOMException("aborted", "AbortError")),
          );
        },
      });
      return new Response(body, { status: 200 });
    }, 10);

    const error = (await apiFetch("/x").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
  });
});

describe("apiFetch: configuration errors", () => {
  it("lets a missing base URL error through unchanged, and does not call fetch", async () => {
    let called = false;
    const apiFetch = createApiFetch({
      resolveBaseUrl: () => {
        throw new Error("VITE_API_BASE_URL is not set.");
      },
      fetchImpl: async () => {
        called = true;
        return jsonResponse({});
      },
    });

    const error = await apiFetch("/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as Error).message).toMatch(/not set/);
    expect(called).toBe(false);
  });
});

describe("apiFetch: caller headers survive any init.headers shape", () => {
  it("keeps Authorization when init.headers is a Headers instance", async () => {
    let sent: Headers | undefined;
    const apiFetch = clientWith(async (_url, init) => {
      sent = new Headers(init.headers);
      return jsonResponse({});
    });

    await apiFetch("/x", { headers: new Headers({ Authorization: "Bearer abc" }) });

    expect(sent?.get("authorization")).toBe("Bearer abc");
    expect(sent?.get("accept")).toBe("application/json");
  });

  it("keeps Authorization when init.headers is a tuple array", async () => {
    let sent: Headers | undefined;
    const apiFetch = clientWith(async (_url, init) => {
      sent = new Headers(init.headers);
      return jsonResponse({});
    });

    await apiFetch("/x", { headers: [["Authorization", "Bearer xyz"]] });

    expect(sent?.get("authorization")).toBe("Bearer xyz");
  });

  it("keeps a caller's own Accept header instead of overwriting it", async () => {
    let sent: Headers | undefined;
    const apiFetch = clientWith(async (_url, init) => {
      sent = new Headers(init.headers);
      return jsonResponse({});
    });

    await apiFetch("/x", { headers: { Accept: "text/csv" } });

    expect(sent?.get("accept")).toBe("text/csv");
  });
});

describe("apiFetch: cancellation", () => {
  it("passes a caller's cancel through to the request and rethrows the abort, not an ApiError", async () => {
    const caller = new AbortController();
    const apiFetch = clientWith(stalledFetch, 5_000);

    const pending = apiFetch("/x", { signal: caller.signal }).catch((e: unknown) => e);
    caller.abort();
    const error = await pending;

    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as Error).name).toBe("AbortError");
  });

  it("still reports a timeout as an ApiError when the caller did not cancel", async () => {
    const caller = new AbortController();
    const apiFetch = clientWith(stalledFetch, 10);

    const error = (await apiFetch("/x", { signal: caller.signal }).catch(
      (e: unknown) => e,
    )) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toMatch(/took too long/i);
  });
});

describe("apiFetch: correlation and session IDs", () => {
  it("sends a correlation ID and a session ID on every request", async () => {
    let sent: Headers | undefined;
    const apiFetch = createApiFetch({
      resolveBaseUrl: () => BASE,
      fetchImpl: async (_url, init) => {
        sent = new Headers(init.headers);
        return jsonResponse({});
      },
      newId: () => "11111111-1111-4111-8111-111111111111",
    });

    await apiFetch("/x");

    expect(sent?.get("x-correlation-id")).toBe("11111111-1111-4111-8111-111111111111");
    expect(sent?.get("x-session-id")).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("gives each call its own correlation ID but reuses one session ID", async () => {
    const seen: Headers[] = [];
    let counter = 0;
    const apiFetch = createApiFetch({
      resolveBaseUrl: () => BASE,
      fetchImpl: async (_url, init) => {
        seen.push(new Headers(init.headers));
        return jsonResponse({});
      },
      newId: () => `id-${++counter}`,
    });

    await apiFetch("/a");
    await apiFetch("/b");

    expect(seen[0]?.get("x-correlation-id")).not.toBe(seen[1]?.get("x-correlation-id"));
    expect(seen[0]?.get("x-session-id")).toBe(seen[1]?.get("x-session-id"));
  });

  it("keeps a correlation ID the caller already set", async () => {
    let sent: Headers | undefined;
    const apiFetch = clientWith(async (_url, init) => {
      sent = new Headers(init.headers);
      return jsonResponse({});
    });

    await apiFetch("/x", { headers: { "X-Correlation-Id": "caller-id" } });

    expect(sent?.get("x-correlation-id")).toBe("caller-id");
  });
});
