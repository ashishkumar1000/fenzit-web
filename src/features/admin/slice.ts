import { ApiError } from "../../services/api";

/** A per-section result: the section either has its data or it failed on its
 *  own, so one flaky endpoint never blanks the whole page. */
export type Slice<T> = { ok: true; data: T } | { ok: false };

export async function settle<T>(run: () => Promise<T>): Promise<Slice<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    // A dead or refused session is not a degraded section — retrying forever
    // cannot recover it. Auth errors (401/403, the same rule isAuthError
    // applies) re-throw so the loader's catch can clear the session and send
    // the visitor to login; every other failure settles to the slice.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw error;
    }
    return { ok: false };
  }
}
