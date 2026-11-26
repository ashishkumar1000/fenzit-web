import { fetchCurrentUser, type CurrentUser } from "./adminApi";

/**
 * The console's shared identity (CAP-8, 2026-11-26): every navigation burst
 * runs the layout loader's access check AND each section loader's
 * requireConsoleRole, and both read GET /users/me — before this cache, two
 * identical fetches rode every burst. This module keeps one short-TTL answer
 * per session token, mirroring the leave summary cache: the parallel pair
 * (and a quick hop between sections) shares a single network call.
 *
 * The cost of sharing is staleness, bounded by the TTL: a role change (the
 * super-admin flag, the owner flag) may lag at most 30 seconds — an accepted
 * trade for not re-asking the server who the caller is on every hop. The
 * cache never holds a failure: a dead token's 401 reaches every waiter, and
 * the login redirect clears the session, so an entry keyed by a dead token
 * becomes unreachable garbage the TTL outlives.
 */

/** The staleness bound (§4.8): a role change may lag at most this long.
 *  Exported so a test can pin the shipped default instead of restating it. */
export const DEFAULT_TTL_MS = 30_000;
let ttlMs = DEFAULT_TTL_MS;

type Entry = { me: CurrentUser; fetchedAt: number };

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<CurrentUser>>();

function load(token: string): Promise<CurrentUser> {
  const cached = entries.get(token);
  if (cached && Date.now() - cached.fetchedAt < ttlMs) {
    return Promise.resolve(cached.me);
  }
  const running = inflight.get(token);
  if (running) return running;
  // No caller's signal rides the shared fetch — one navigation's abort must
  // not kill the read another loader is waiting on (the layout and the child
  // section loader run in parallel). Callers consult their signal only in
  // their degrade path, never on the success side.
  const flight = fetchCurrentUser(token).then(
    (me) => {
      // Only a still-registered flight may cache: an invalidation
      // deregisters in-flight reads so their (older) answer never lands.
      if (inflight.get(token) === flight) {
        inflight.delete(token);
        entries.set(token, { me, fetchedAt: Date.now() });
      }
      return me;
    },
    (error: unknown) => {
      if (inflight.get(token) === flight) inflight.delete(token);
      throw error;
    },
  );
  inflight.set(token, flight);
  return flight;
}

/** The signed-in identity, from the shared cache while it is fresh. */
export function readCurrentUserCached(token: string): Promise<CurrentUser> {
  return load(token);
}

/** The identity is no longer trustworthy for this token set: the caller
 *  signed in, signed out, or the console's access check caught a dead
 *  session. Login/logout swap the token, so this is also hygiene; a 401's
 *  redirect makes the dead-token entries unreachable either way. */
export function invalidateIdentityCache(): void {
  entries.clear();
  // Deregister any in-flight read too: its answer predates the invalidation,
  // so it must neither serve a post-invalidation loader nor land in the cache.
  inflight.clear();
}

/** Test seam: shrink the TTL so a route test can walk a burst, expire it,
 *  and pin what the next burst does — the 30s default would outlive the test. */
export function setIdentityTtlForTests(ms: number): void {
  ttlMs = ms;
}

/** Test seam: the module state outlives a single test — reset it between
 *  tests so one test's cached identity never leaks into the next (and the
 *  real TTL comes back with it). */
export function resetIdentityCacheForTests(): void {
  entries.clear();
  inflight.clear();
  ttlMs = DEFAULT_TTL_MS;
}
