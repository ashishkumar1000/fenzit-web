import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../../testing/fetchMock";
import {
  DEFAULT_TTL_MS,
  invalidateIdentityCache,
  readCurrentUserCached,
  resetIdentityCacheForTests,
  setIdentityTtlForTests,
} from "./identityCache";
import type { CurrentUser } from "./adminApi";

// The identity cache's contract, pinned at the seam the loaders see: the
// layout loader's access check and every section loader's requireConsoleRole
// in one navigation burst share a single /users/me read within the TTL; a
// parallel burst shares the in-flight read; invalidation wins over an
// in-flight read (its older answer neither serves nor caches); failures are
// never cached.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const me = (name: string): CurrentUser => ({
  id: "u-1",
  name,
  role: "company_admin",
  platformAdmin: false,
  email: null,
  countryCode: "+91",
  phoneNumber: "9876543210",
  employeeCode: null,
  status: null,
});

const meReads = () => sentRequests().filter((r) => r.url.endsWith("/api/v1/users/me"));

// The deferred flight: the test holds the release handle, so an invalidation
// can land while a read is still in the air.
let release: ((name: string) => void) | null = null;

beforeEach(() => {
  installFetchMock();
  resetIdentityCacheForTests();
  release = null;
  setRespond((url) => {
    if (url.endsWith("/api/v1/users/me")) {
      return new Promise<Response>((resolve) => {
        release = (name: string) => resolve(jsonResponse(me(name)));
      });
    }
    return jsonResponse({});
  });
});

afterEach(() => {
  restoreFetchMock();
  resetIdentityCacheForTests();
});

describe("identityCache", () => {
  test("a burst's second read is served by the cache, not the wire", async () => {
    setRespond((url) =>
      url.endsWith("/api/v1/users/me") ? jsonResponse(me("Ravi")) : jsonResponse({}),
    );

    const first = await readCurrentUserCached("tok-1");
    const second = await readCurrentUserCached("tok-1");

    expect(first.name).toBe("Ravi");
    expect(second.name).toBe("Ravi");
    expect(meReads()).toHaveLength(1);
  });

  test("parallel bursts share one in-flight read", async () => {
    // The beforeEach responder defers every /users/me read — the shared
    // flight releases once, and both waiters read the same answer.
    const a = readCurrentUserCached("tok-2");
    const b = readCurrentUserCached("tok-2");
    await sleep(10);
    expect(release).not.toBeNull();
    release?.("Ravi");
    const [first, second] = await Promise.all([a, b]);

    expect(first.name).toBe("Ravi");
    expect(second.name).toBe("Ravi");
    expect(meReads()).toHaveLength(1);
  });

  test("different tokens read separately", async () => {
    setRespond((url) =>
      url.endsWith("/api/v1/users/me") ? jsonResponse(me("Ravi")) : jsonResponse({}),
    );

    await readCurrentUserCached("tok-a");
    await readCurrentUserCached("tok-b");

    expect(meReads()).toHaveLength(2);
  });

  test("the shipped staleness bound is 30s — a role change may lag at most that long", () => {
    resetIdentityCacheForTests();
    expect(DEFAULT_TTL_MS).toBe(30_000);
  });

  test("a failure is never cached — the next read retries", async () => {
    let failing = true;
    setRespond((url) => {
      if (url.endsWith("/api/v1/users/me")) {
        return failing
          ? jsonResponse({ error_code: "DOWN", message: "no" }, 500)
          : jsonResponse(me("Ravi"));
      }
      return jsonResponse({});
    });

    let rejected = false;
    try {
      await readCurrentUserCached("tok-3");
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);

    failing = false;
    const second = await readCurrentUserCached("tok-3");

    expect(second.name).toBe("Ravi");
    expect(meReads()).toHaveLength(2);
  });

  test("invalidation drops the cached answer and deregisters an in-flight read", async () => {
    const flight = readCurrentUserCached("tok-4");
    await sleep(10);
    expect(release).not.toBeNull();

    invalidateIdentityCache();
    // The invalidated flight still serves its own waiter, but must not cache.
    release?.("Ravi");
    const served = await flight;
    expect(served.name).toBe("Ravi");

    // A read after the invalidation re-asks the wire — the first answer did
    // not land in the cache.
    const after = readCurrentUserCached("tok-4");
    await sleep(10);
    release?.("Regraded");
    const result = await after;
    expect(result.name).toBe("Regraded");
    expect(meReads()).toHaveLength(2);
  });

  test("within the TTL the cache serves the cached answer even when the server would answer differently", async () => {
    // The staleness trade, pinned: the second read inside the burst never
    // re-asks, so a role change may lag at most the (30s) TTL by design.
    let name = "Ravi";
    setRespond((url) =>
      url.endsWith("/api/v1/users/me") ? jsonResponse(me(name)) : jsonResponse({}),
    );

    await readCurrentUserCached("tok-5");
    name = "Someone Else";
    const second = await readCurrentUserCached("tok-5");

    expect(second.name).toBe("Ravi");
    expect(meReads()).toHaveLength(1);
  });

  test("past the TTL the next read re-asks the wire", async () => {
    // Route tests walk this by shrinking the TTL: once the entry expires,
    // a later burst reads the server's current answer again.
    setIdentityTtlForTests(10);
    setRespond((url) =>
      url.endsWith("/api/v1/users/me") ? jsonResponse(me("Ravi")) : jsonResponse({}),
    );

    await readCurrentUserCached("tok-6");
    await sleep(40);
    const second = await readCurrentUserCached("tok-6");

    expect(second.name).toBe("Ravi");
    expect(meReads()).toHaveLength(2);
  });
});
