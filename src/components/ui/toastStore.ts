/**
 * The console's toast store (CAP-5, 2026-11-26): a hand-rolled module-level
 * emitter — no dependencies — so a mutation's completion or failure is
 * announced once, in one place, and survives the card's re-renders and the
 * user's scroll (loading-cases §4: status lines that scroll away, resend
 * outcomes that die with the row).
 *
 * Contract:
 *   - success/info toasts auto-dismiss (SUCCESS_TTL_MS) — completions are
 *     transient;
 *   - error toasts NEVER auto-dismiss (§5: errors never auto-dismiss) —
 *     they leave through their own dismiss button;
 *   - the stack is capped (MAX_TOASTS): when full, the oldest non-error
 *     toast yields first; only when the stack is entirely alerts does the
 *     oldest alert yield — a completion can never push an alert out;
 *   - the store never holds DOM: the host (ToastHost) renders, this module
 *     only keeps state and notifies.
 */

import { ApiError } from "../../services/api";
import { messageForError } from "../../utils/errorMessages";

export type ToastTone = "success" | "error";

/** The one sentence both 401 sites speak (§4.8) — shared so the re-login
 *  path can find and clear exactly these toasts by message. */
export const SESSION_ENDED_MESSAGE = "Your session has ended. Please sign in again to continue.";

/** The session-expiry reading of a dead-token failure (§4.8): a 401 is not
 *  "a validation error" — it says the sign-in ended mid-form, so its toast
 *  carries the re-login hint. Anything else speaks its own message. */
export function toastForFailure(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    pushToast(SESSION_ENDED_MESSAGE, "error");
    return;
  }
  pushToast(messageForError(error), "error");
}

/** Sites whose own inline error already speaks for itself get only the
 *  session-expiry toast — the one case the inline line cannot outlive a
 *  redirect. A 401 is silent in every other reading. */
export function toastIfSessionEnded(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    pushToast(SESSION_ENDED_MESSAGE, "error");
  }
}

/** Sign-in clears the stale notices: an alert left over from the session
 *  that just ended must not survive into the session that replaced it. */
export function dismissSessionEndedToasts(): void {
  for (const toast of [...toasts]) {
    if (toast.message === SESSION_ENDED_MESSAGE) dismissToast(toast.id);
  }
}

export interface ToastEntry {
  id: number;
  tone: ToastTone;
  message: string;
}

/** How long a completion stays up before it leaves on its own. */
export const SUCCESS_TTL_MS = 5000;
/** The visible stack's cap — a burst of saves cannot bury the screen. */
export const MAX_TOASTS = 4;

let toasts: ToastEntry[] = [];
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function clearTimer(id: number): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

/** Snapshot identity matters: every change REPLACES the array, so
 *  useSyncExternalStore sees a new reference and re-renders the host. */
function dropAt(index: number): void {
  const dropped = toasts[index];
  if (dropped === undefined) return;
  clearTimer(dropped.id);
  toasts = toasts.filter((_, kept) => kept !== index);
}

/** Announce one outcome. Errors announce with role="alert" and never leave
 *  on their own; everything else politely auto-dismisses. Returns the id so
 *  a caller can dismiss its own toast early. */
export function pushToast(
  message: string,
  tone: ToastTone = "success",
  ttlMs: number = SUCCESS_TTL_MS,
): number {
  const id = nextId;
  nextId += 1;
  while (toasts.length >= MAX_TOASTS) {
    const oldestNonError = toasts.findIndex((toast) => toast.tone !== "error");
    dropAt(oldestNonError === -1 ? 0 : oldestNonError);
  }
  toasts = [...toasts, { id, tone, message }];
  if (tone !== "error") {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), ttlMs),
    );
  }
  notify();
  return id;
}

/** Manual dismissal — the error toasts' only exit. */
export function dismissToast(id: number): void {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index === -1) return;
  dropAt(index);
  notify();
}

/** useSyncExternalStore seam. */
export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToastsSnapshot(): ToastEntry[] {
  return toasts;
}

/** Test seam: the module state outlives a single test — clear it (and its
 *  pending auto-dismiss timers) between tests. */
export function resetToastsForTests(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  toasts = [];
  listeners.clear();
}
