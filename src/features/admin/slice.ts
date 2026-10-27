/** A per-section result: the section either has its data or it failed on its
 *  own, so one flaky endpoint never blanks the whole page. */
export type Slice<T> = { ok: true; data: T } | { ok: false };

export async function settle<T>(run: () => Promise<T>): Promise<Slice<T>> {
  try {
    return { ok: true, data: await run() };
  } catch {
    return { ok: false };
  }
}
