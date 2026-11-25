import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../../testing/fetchMock";
import type { LeaveSummary } from "./companyApi";
import {
  invalidateLeaveSummaryCache,
  readLeaveSummaryCached,
  resetLeaveSummaryCacheForTests,
} from "./leaveSummaryCache";

// The shared summary cache's contract, pinned at the seam the UI never sees:
// a decision's invalidation must win over an in-flight read — the older
// answer still serves its own waiter, but it may neither land in the cache
// nor serve a later read. An undisturbed flight still caches, so the
// parallel layout+child loader pair stays one network call.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

const summary = (pending: number): LeaveSummary =>
  ({ counts: { pending, approved: 0, revoked: 0, rejected: 0, cancelled: 0 } }) as LeaveSummary;

const summaryReads = () =>
  sentRequests().filter((r) => r.url.endsWith("/attendance/leave/summary"));

// The deferred flight: the responder hands the test the release handle, so
// an invalidation can land while the read is still in the air.
let release: ((pending: number) => void) | null = null;

beforeEach(() => {
  installFetchMock();
  resetLeaveSummaryCacheForTests();
  release = null;
  setRespond((url) => {
    if (url.endsWith("/attendance/leave/summary")) {
      return new Promise<Response>((resolve) => {
        release = (pending: number) => resolve(jsonResponse(summary(pending)));
      });
    }
    return jsonResponse({});
  });
});

afterEach(() => {
  restoreFetchMock();
  resetLeaveSummaryCacheForTests();
});

describe("the shared leave summary cache", () => {
  it("a decision's invalidation beats an in-flight read — the stale answer never lands", async () => {
    const flight = readLeaveSummaryCached("tok-1");
    expect(release).not.toBeNull();
    // The decision lands while the read is in the air: entries and inflight
    // both clear, so the pre-decision answer serves nobody after this.
    invalidateLeaveSummaryCache();
    release?.(7);
    // The waiter still gets the answer it asked for — its degrade contract
    // is its own; the point is that the CACHE never holds it.
    expect((await flight).counts?.pending).toBe(7);
    // The next read is a fresh network call — the stale answer is neither
    // cached nor registered as in-flight.
    const next = readLeaveSummaryCached("tok-1");
    release?.(0);
    expect((await next).counts?.pending).toBe(0);
    expect(summaryReads()).toHaveLength(2);
  });

  it("an undisturbed flight still caches — the TTL read is one network call", async () => {
    const first = readLeaveSummaryCached("tok-2");
    release?.(3);
    await first;
    // Inside the TTL: served from the cache, no second GET.
    expect((await readLeaveSummaryCached("tok-2")).counts?.pending).toBe(3);
    expect(summaryReads()).toHaveLength(1);
  });
});
