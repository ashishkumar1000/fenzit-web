import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { messageForError } from "../../utils/errorMessages";
import {
  approveLeave,
  fetchLeaveBalances,
  fetchLeaveCoverage,
  fetchLeavePage,
  fetchLeaveTypes,
  patchLeaveType,
  rejectLeave,
  revokeLeave,
  type LeaveBalanceRow,
  type LeaveCoverage,
  type LeaveTypePatch,
  type LeaveTypeRow,
} from "./leaveApi";
import type { HolidayRow, LeaveRow, LeaveStatusCounts, LeaveSummary, Page } from "./companyApi";
import { fetchHolidays } from "./companyApi";
import { isMonth, localIsoToday, monthBounds } from "./leaveDateMath";
import { invalidateLeaveSummaryCache, readLeaveSummaryCached } from "./leaveSummaryCache";

/**
 * Loaders for the owner's Leave section: the fixed leave-type catalog on the
 * first tab, the whole-company requests with their approvals on the second,
 * and the month calendar of approved time off on the third. Each tab fetches
 * only its own data — a tab change is navigation, so nothing the user is not
 * looking at is asked of the backend.
 */

export type LeaveTab = "types" | "requests" | "calendar";
export type LeaveFail = { state: "failed"; tab: LeaveTab };

/** The open detail card's data: the request itself, the employee's
 *  balances, and the request's coverage check. `balances: null` /
 *  `coverage: null` = that read failed (the card still shows — it says the
 *  fact could not be loaded). */
export type LeaveSelection = {
  request: LeaveRow;
  balances: LeaveBalanceRow[] | null;
  coverage: LeaveCoverage | null;
};

export type LeaveData =
  | { state: "ok"; tab: "types"; rows: LeaveTypeRow[]; selfName: string | null }
  | {
      state: "ok";
      tab: "requests";
      status: LeaveStatusFilter;
      /** The free-text needle, "" = no search. */
      q: string;
      /** "YYYY-MM" the list is windowed to, "" = all time. */
      month: string;
      cursor: string;
      selected: string;
      page: Page<LeaveRow>;
      /** The whole tenant's pill counts — null when the summary read failed
       *  or an older backend (no counts yet) answered it (pills go bare). */
      counts: LeaveStatusCounts | null;
      selection: LeaveSelection | null;
      selfName: string | null;
    }
  | {
      state: "ok";
      tab: "calendar";
      /** "YYYY-MM" — the month the grid renders; defaults stay in the URL. */
      month: string;
      /** Approved requests overlapping the month (27-1's from/to window). */
      page: Page<LeaveRow>;
      /** Approved requests overlapping [today, today + UPCOMING_WINDOW_DAYS]. */
      upcoming: LeaveRow[];
      /** True when the upcoming window's read hit its page cap — the
       *  timeline's truncation line renders from this, never silently. */
      upcomingHasMore: boolean;
      /** The tenant's holidays — the grid's tints and the holidays rail. */
      holidays: HolidayRow[];
      /** The team-size fact the pulse card's availability meter divides by —
       *  null when the summary read failed (the meter hides, the tab stays). */
      summary: LeaveSummary | null;
      selfName: string | null;
    }
  | LeaveFail;

/** The status filters the backend's derived status accepts (same words the
 *  list renders); "all" sends no status param at all. */
export const LEAVE_STATUSES = ["pending", "approved", "revoked", "cancelled", "rejected"] as const;
export type LeaveStatusFilter = "all" | (typeof LEAVE_STATUSES)[number];

const LEAVE_STATUS_SET = new Set<string>(LEAVE_STATUSES);

export type LeaveFilters = {
  status: LeaveStatusFilter;
  /** The free-text needle; "" = no search. */
  q: string;
  /** "YYYY-MM" the list is windowed to; "" = all time. */
  month: string;
  /** The keyset cursor the backend handed back; "" = first page. */
  cursor: string;
  /** The open detail card's request id; "" = the first row is picked. */
  selected: string;
};

/** Reads the requests-tab address into filters; anything unknown falls back
 *  to its default, so a hand-edited URL never breaks the page. A cursor is
 *  opaque — it is only trimmed and capped, never interpreted. */
export function readLeaveFilters(params: URLSearchParams): LeaveFilters {
  const rawStatus = params.get("status") ?? "";
  const rawCursor = params.get("cursor") ?? "";
  const rawSelected = params.get("selected") ?? "";
  const rawQ = params.get("q") ?? "";
  const rawMonth = params.get("month") ?? "";
  return {
    status: LEAVE_STATUS_SET.has(rawStatus) ? (rawStatus as LeaveStatusFilter) : "all",
    q: rawQ.trim().slice(0, 100),
    month: isMonth(rawMonth) ? rawMonth : "",
    cursor: rawCursor.trim().slice(0, 300),
    selected: rawSelected.trim().slice(0, 100),
  };
}

/** The requests page size. Fixed — the pager is a cursor's Older/Start-over
 *  pair, so the page keeps no rows-per-page select. */
export const LEAVE_PAGE_SIZE = 20;

/** The calendar page reads at most this many approved requests per window —
 *  the backend's hard page cap; `hasMore` on either read renders the honest
 *  "more exist" line instead of a complete-looking grid. */
export const LEAVE_CALENDAR_LIMIT = 50;

/** How far ahead the upcoming rail looks — a product guess, pinned here so
 *  it stays a one-line change. */
export const UPCOMING_WINDOW_DAYS = 60;

function isoPlusDays(iso: string, days: number): string {
  const next = new Date(
    Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) + days),
  );
  return next.toISOString().slice(0, 10);
}

/** One degrade-able detail read: an auth failure propagates to the loader's
 *  login redirect, an abort rethrows so React Router can move on, and any
 *  other failure (the route not deployed yet, a 500) costs its own card
 *  fact only. */
async function readDetailOrNull<T>(
  read: (token: string, signal: AbortSignal) => Promise<T>,
  token: string,
  signal: AbortSignal,
): Promise<T | null> {
  try {
    return await read(token, signal);
  } catch (error) {
    if (isAuthError(error)) throw error;
    if (signal.aborted) throw error;
    return null;
  }
}

/** Resolves the selected request into the detail card's data: the request
 *  must be on the loaded page (a stale id — decided elsewhere, another
 *  filter — just means no card), its balances and coverage come along as
 *  the two degrade-able reads. */
async function resolveSelection(
  token: string,
  selected: string,
  page: Page<LeaveRow>,
  signal: AbortSignal,
): Promise<LeaveSelection | null> {
  if (selected === "") return null;
  const request = page.data.find((row) => row.id === selected);
  if (request === undefined) return null;
  const [balances, coverage] = await Promise.all([
    readDetailOrNull(
      (bearer, abort) => fetchLeaveBalances(bearer, request.employeeId, abort),
      token,
      signal,
    ),
    readDetailOrNull(
      (bearer, abort) => fetchLeaveCoverage(bearer, request.id, abort),
      token,
      signal,
    ),
  ]);
  return { request, balances, coverage };
}

/** The summary read is degrade-able — the pills' counts and the pulse's
 *  capacity fact, nothing else. It rides the module's shared cache: the
 *  layout's badge read and this one are the same GET, not two. A non-auth
 *  failure (the route not deployed yet, a 500) costs the numbers only; the
 *  list, grid and rail cards stay. An auth failure still propagates to the
 *  loader's login redirect. An abort shows up only in the catch — the
 *  shared fetch carries no signal — and rethrows there so the router drops
 *  the result it would have dropped anyway. */
async function readSummaryOrNull(token: string, signal: AbortSignal): Promise<LeaveSummary | null> {
  try {
    return await readLeaveSummaryCached(token);
  } catch (error) {
    if (isAuthError(error)) throw error;
    if (signal.aborted) throw error;
    return null;
  }
}

export async function adminLeaveLoader({ request }: LoaderFunctionArgs): Promise<LeaveData> {
  const url = new URL(request.url);
  const rawTab = url.searchParams.get("tab");
  const tab: LeaveTab = rawTab === "requests" || rawTab === "calendar" ? rawTab : "types";
  try {
    const { token, me } = await requireConsoleRole(request, ["owner"]);
    if (tab === "calendar") {
      const rawMonth = url.searchParams.get("month") ?? "";
      const month = isMonth(rawMonth) ? rawMonth : localIsoToday().slice(0, 7);
      const today = localIsoToday();
      const window = monthBounds(month);
      const [page, upcomingPage, holidays, summary] = await Promise.all([
        fetchLeavePage(
          token,
          { status: "approved", from: window.from, to: window.to, limit: LEAVE_CALENDAR_LIMIT },
          request.signal,
        ),
        fetchLeavePage(
          token,
          {
            status: "approved",
            from: today,
            to: isoPlusDays(today, UPCOMING_WINDOW_DAYS),
            limit: LEAVE_CALENDAR_LIMIT,
          },
          request.signal,
        ),
        fetchHolidays(token, request.signal),
        readSummaryOrNull(token, request.signal),
      ]);
      return {
        state: "ok",
        tab,
        month,
        page,
        upcoming: upcomingPage.data,
        upcomingHasMore: upcomingPage.hasMore,
        holidays,
        summary,
        selfName: me.name,
      };
    }
    if (tab === "requests") {
      const filters = readLeaveFilters(url.searchParams);
      const window = filters.month === "" ? null : monthBounds(filters.month);
      const [page, summary] = await Promise.all([
        fetchLeavePage(
          token,
          {
            limit: LEAVE_PAGE_SIZE,
            ...(filters.status !== "all" ? { status: filters.status } : {}),
            ...(window !== null ? { from: window.from, to: window.to } : {}),
            ...(filters.q !== "" ? { q: filters.q } : {}),
            ...(filters.cursor !== "" ? { cursor: filters.cursor } : {}),
          },
          request.signal,
        ),
        readSummaryOrNull(token, request.signal),
      ]);
      // The details card is always present (the design shows one selected
      // request beside the list): with no `selected=` in the address the
      // first row is picked. A selected id that is no longer on the page —
      // decided elsewhere, another filter — falls back to the first row too,
      // so the card never goes blank.
      const selected = page.data.some((row) => row.id === filters.selected)
        ? filters.selected
        : (page.data[0]?.id ?? "");
      const selection = await resolveSelection(token, selected, page, request.signal);
      return {
        state: "ok",
        tab,
        status: filters.status,
        q: filters.q,
        month: filters.month,
        cursor: filters.cursor,
        selected,
        counts: summary?.counts ?? null,
        page,
        selection,
        selfName: me.name,
      };
    }
    return {
      state: "ok",
      tab,
      rows: await fetchLeaveTypes(token, request.signal),
      selfName: me.name,
    };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed", tab };
  }
}

/** The Leave page's actions: save one type's values, decide one request.
 *  The `kind` names the submission that ran — each form on the page reads
 *  only its own fetcher's result, so it never needs to disambiguate. */
export type LeaveActionKind = "save-type" | "approve" | "reject" | "revoke";

export type LeaveActionResult =
  | { kind: LeaveActionKind; state: "done" }
  | { kind: LeaveActionKind; state: "error"; message: string };

function stringField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** A number from a form field: finite, 0–366, at most 2 decimals — the
 *  backend's own accrualDays rule. */
function parseAccrualDays(raw: string): number | null {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(raw)) return null;
  const days = Number(raw);
  return days >= 0 && days <= 366 ? days : null;
}

const SAVE_ERROR = "That save could not be sent. Try again.";

/** The Leave page's action: one intent per submission. The type's form
 *  carries hidden inputs only for the fields that changed, so the PATCH
 *  body stays changed-fields-only — the same contract the backend's
 *  values-only PATCH promises. */
export async function adminLeaveAction({
  request,
}: ActionFunctionArgs): Promise<LeaveActionResult> {
  // Parsed after the auth check; `intent` is hoisted so the catch below can
  // still name the kind when the body itself fails to parse.
  let intent: FormDataEntryValue | null = null;
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    const form = await request.formData();
    intent = form.get("intent");

    if (intent === "save-type") {
      const typeId = stringField(form, "typeId");
      const mode = stringField(form, "mode");
      if (typeId === "") return { kind: "save-type", state: "error", message: SAVE_ERROR };
      const values: LeaveTypePatch = {};
      if (form.has("accrualDays")) {
        const days = parseAccrualDays(stringField(form, "accrualDays"));
        if (days === null) {
          return {
            kind: "save-type",
            state: "error",
            message: "Enter days as a number up to 366, with at most 2 decimals.",
          };
        }
        if (mode !== "monthly" && mode !== "annual" && days > 0) {
          return {
            kind: "save-type",
            state: "error",
            message: "This leave type has no accrual to configure.",
          };
        }
        values.accrualDays = days;
      }
      for (const flag of ["carryForward", "allowOverBalance", "paid", "enabled"] as const) {
        if (!form.has(flag)) continue;
        if (mode !== "monthly" && (flag === "carryForward" || flag === "allowOverBalance")) {
          return {
            kind: "save-type",
            state: "error",
            message: "Only monthly-accruing leave can carry forward or go over balance.",
          };
        }
        values[flag] = stringField(form, flag) === "true";
      }
      if (Object.keys(values).length === 0) {
        return { kind: "save-type", state: "error", message: "Nothing changed to save." };
      }
      await patchLeaveType(token, typeId, values, request.signal);
      return { kind: "save-type", state: "done" };
    }

    const id = stringField(form, "id");
    if ((intent === "approve" || intent === "reject" || intent === "revoke") && id !== "") {
      // Every decision moves requests between statuses — the shared summary
      // cache must not serve its pre-decision counts to the revalidation.
      const dropCounts = () => invalidateLeaveSummaryCache();
      if (intent === "approve") {
        // The card's one note input feeds both decisions: on approve it is
        // the audit note, on decline the rejection reason.
        const note = stringField(form, "reason").slice(0, 500);
        await approveLeave(token, id, note, request.signal);
        dropCounts();
        return { kind: "approve", state: "done" };
      }
      if (intent === "reject") {
        const reason = stringField(form, "reason").slice(0, 500);
        await rejectLeave(token, id, reason, request.signal);
        dropCounts();
        return { kind: "reject", state: "done" };
      }
      const reason = stringField(form, "reason").slice(0, 500);
      if (reason === "") {
        return {
          kind: "revoke",
          state: "error",
          message: "Give a reason — the employee sees why their approved leave was revoked.",
        };
      }
      await revokeLeave(token, id, reason, request.signal);
      dropCounts();
      return { kind: "revoke", state: "done" };
    }

    return { kind: "save-type", state: "error", message: SAVE_ERROR };
  } catch (error) {
    // Stale decisions (LEAVE_NOT_PENDING / LEAVE_NOT_REVOKABLE) get their
    // plain-English lines from MESSAGES_BY_CODE; everything else goes through
    // the shared mapping — still on the code, never the message.
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const message = messageForError(error);
    const kind: LeaveActionKind =
      intent === "save-type"
        ? "save-type"
        : intent === "approve"
          ? "approve"
          : intent === "reject"
            ? "reject"
            : "revoke";
    return { kind, state: "error", message };
  }
}
