import { ApiError } from "../../services/api";
import { readSession } from "../../services/session";
import { pushToast, toastIfSessionEnded } from "../../components/ui/toastStore";
import { fetchRuns, type PayrollRunView } from "./payrollRunApi";
import { fmtMonthHead } from "./payrollFormat";

/**
 * The payroll run watcher (CAP-9, 2026-11-26). A run is async on the BE —
 * triggerRun answers 202 with a queued run — but the outcome must reach the
 * person wherever they are, not only on the Runs tab's manual Refresh. One
 * module-level loop polls the EXISTING runs list (GET /api/v1/payroll/runs —
 * no BE change, no realtime transport), watches every in-flight run it is
 * given, and when one lands terminal:
 *
 *   - toasts the outcome once (completion as a polite status, failure as a
 *     role="alert" carrying the BE's own errorMessage) — so the result is
 *     heard on any console page and survives a navigation;
 *   - revalidates the payroll route when it is mounted (the page registers
 *     itself), so the summary appears without a manual Refresh;
 *   - forgets the run. A page reload mid-run resumes the watch from the
 *     loader's own runs list, so the outcome still surfaces on the next
 *     visit.
 *
 * Cadence is modest with backoff aligned to the page's own 15-minute staleness
 * hint: first poll ~5s, then ×1.6 up to a ~60s ceiling, with a ~15.5-minute
 * budget per run — past it the watcher stops silently, because the page's
 * stale-run hint (and a re-trigger) already own that reading.
 */

const FIRST_DELAY_MS = 5_000;
const BACKOFF = 1.6;
const MAX_DELAY_MS = 60_000;
const BUDGET_MS = 15.5 * 60 * 1000;

// Test knobs: the real values are the constants above; tests run the same
// loop with delays they can wait out.
let firstDelayMs = FIRST_DELAY_MS;
let budgetMs = BUDGET_MS;

interface Watched {
  id: string;
  month: string;
  /** Absolute give-up time, set when the run joins the watch. */
  deadlineAt: number;
}

const watched = new Map<string, Watched>();
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let delayMs = FIRST_DELAY_MS;
/** The payroll route's revalidate, registered while the page is mounted. */
let onRevalidate: (() => void) | null = null;

/** The page tells the watcher it is here; the watcher revalidates it when a
 *  watched run lands terminal. Passing null unregisters (unmount). */
export function setPayrollRunRevalidator(revalidate: (() => void) | null): void {
  onRevalidate = revalidate;
}

/** A run the console just triggered (the 202 answer): watch it. */
export function watchPayrollRun(run: PayrollRunView): void {
  settleRun(run);
  if (run.status !== "queued" && run.status !== "running") return;
  upsert(run);
  ensureLoop();
}

/** Runs already in flight, read off the payroll loader on mount — the reload
 *  mid-run path. Runs the watcher already tracks settle here too, so a
 *  loader refetch that saw the outcome first still toasts it exactly once. */
export function resumePayrollRunWatch(runs: readonly PayrollRunView[]): void {
  for (const run of runs) {
    if (!settleRun(run) && (run.status === "queued" || run.status === "running")) {
      upsert(run);
    }
  }
  if (watched.size > 0) ensureLoop();
}

function upsert(run: PayrollRunView): void {
  if (watched.has(run.id)) return;
  watched.set(run.id, {
    id: run.id,
    month: run.month,
    deadlineAt: Date.now() + budgetMs,
  });
}

/** Terminal states settle exactly once (the map is the once-guard): toast
 *  the outcome, revalidate the page if it is mounted, forget the run. */
function settleRun(run: PayrollRunView): boolean {
  const entry = watched.get(run.id);
  if (entry === undefined) return false;
  if (run.status === "completed") {
    watched.delete(run.id);
    pushToast(completedLine(run), "success");
    revalidatePage();
    return true;
  }
  if (run.status === "failed") {
    watched.delete(run.id);
    // The BE failure carries its own words when it has them; an empty
    // string is not words, so it falls to the watcher's line.
    const message =
      run.errorMessage && run.errorMessage.length > 0
        ? run.errorMessage
        : `Salary calculation for ${fmtMonthHead(run.month)} failed.`;
    pushToast(message, "error");
    revalidatePage();
    return true;
  }
  return false;
}

function completedLine(run: PayrollRunView): string {
  const month = fmtMonthHead(run.month);
  if (run.summary !== null && run.summary.status !== "no_employees" && run.summary.payslips > 0) {
    return `Salary calculation for ${month} completed — ${run.summary.payslips} salary slips created.`;
  }
  return `Salary calculation for ${month} completed.`;
}

function revalidatePage(): void {
  if (onRevalidate !== null) onRevalidate();
}

function ensureLoop(): void {
  if (running) return;
  running = true;
  delayMs = firstDelayMs;
  timer = setTimeout(poll, delayMs);
}

function poll(): void {
  timer = null;
  void pollNow();
}

async function pollNow(): Promise<void> {
  const token = readSession()?.token;
  if (token === undefined) {
    // Signed out — nothing can poll. Entries stay so a re-login's next watch
    // call finds them; the loop itself stops.
    running = false;
    return;
  }
  let runs: PayrollRunView[] | null = null;
  try {
    runs = await fetchRuns(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // The session ended under the watcher — the expiry toast carries the
      // re-login hint, and polling cannot continue without a token.
      toastIfSessionEnded(error);
      running = false;
      return;
    }
    // One failed poll is a network blip, not a dead run — keep polling until
    // the entries' budget expires.
  }
  if (runs !== null) {
    for (const run of runs) settleRun(run);
  }
  pruneExpired();
  if (watched.size === 0) {
    running = false;
    return;
  }
  delayMs = Math.min(Math.round(delayMs * BACKOFF), MAX_DELAY_MS);
  timer = setTimeout(poll, delayMs);
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, entry] of watched) {
    if (now >= entry.deadlineAt) watched.delete(id);
  }
}

/** Test seam: clear every watched run, stop the loop, and restore the real
 *  delays — the module state outlives a single test. */
export function resetPayrollRunWatcherForTests(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  running = false;
  delayMs = FIRST_DELAY_MS;
  watched.clear();
  onRevalidate = null;
  firstDelayMs = FIRST_DELAY_MS;
  budgetMs = BUDGET_MS;
}

/** Test seam: run the same loop with delays a test can wait out. */
export function setPayrollRunWatcherDelaysForTests(first: number, budget: number): void {
  firstDelayMs = first;
  budgetMs = budget;
}
