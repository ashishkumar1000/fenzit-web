import { fetchLeaveSummary, type LeaveSummary } from "./companyApi";

/**
 * The tenant's leave summary, shared: the sidebar's badge read and the
 * requests/calendar tab reads all want the same GET, and the layout and
 * child loaders run in parallel — two identical fetches per visit. This
 * module keeps one short-TTL answer per session token so the parallel pair
 * (and a quick hop between the tabs) shares a single network call, while a
 * decision's invalidation keeps the badge honest. Changes that arrive
 * without a decision — an employee's fresh request, say — ride the 30s TTL
 * by design. The cache never holds a failure: an error reaches every waiter
 * through their own degrade contracts, and the next read retries.
 */

const TTL_MS = 30_000;

type Entry = { summary: LeaveSummary; fetchedAt: number };

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<LeaveSummary>>();

function load(token: string): Promise<LeaveSummary> {
  const cached = entries.get(token);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return Promise.resolve(cached.summary);
  }
  const running = inflight.get(token);
  if (running) return running;
  // No caller's signal rides the shared fetch — one navigation's abort must
  // not kill the read another loader is waiting on, and React Router drops
  // an aborted navigation's results anyway. Callers consult their signal
  // only in the degrade path (catch), never on the success side.
  const flight = fetchLeaveSummary(token).then(
    (summary) => {
      // Only a still-registered flight may cache: a decision's invalidation
      // deregisters in-flight reads so their (older) answer never lands —
      // neither serves a post-decision read nor sits in the cache.
      if (inflight.get(token) === flight) {
        inflight.delete(token);
        entries.set(token, { summary, fetchedAt: Date.now() });
      }
      return summary;
    },
    (error: unknown) => {
      if (inflight.get(token) === flight) inflight.delete(token);
      throw error;
    },
  );
  inflight.set(token, flight);
  return flight;
}

/** The summary, from the shared cache while it is fresh. */
export function readLeaveSummaryCached(token: string): Promise<LeaveSummary> {
  return load(token);
}

/** A decision (approve / reject / revoke) moved requests between statuses —
 *  drop the cached counts so the action's revalidation reads fresh ones. */
export function invalidateLeaveSummaryCache(): void {
  entries.clear();
  // Deregister any in-flight read too: its answer predates the decision, so
  // it must neither serve a post-action loader nor land in the cache.
  inflight.clear();
}

/** Test seam: the module state outlives a single test — reset it between
 *  renders so one test's cached answer never leaks into the next. */
export function resetLeaveSummaryCacheForTests(): void {
  entries.clear();
  inflight.clear();
}
