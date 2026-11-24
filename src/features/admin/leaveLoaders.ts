import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { messageForError } from "../../utils/errorMessages";
import {
  approveLeave,
  fetchLeaveBalances,
  fetchLeavePage,
  fetchLeaveTypes,
  patchLeaveType,
  rejectLeave,
  revokeLeave,
  type LeaveBalanceRow,
  type LeaveTypePatch,
  type LeaveTypeRow,
} from "./leaveApi";
import type { HolidayRow, LeaveRow, LeaveSummary, Page } from "./companyApi";
import { fetchHolidays, fetchLeaveSummary } from "./companyApi";
import { isMonth, localIsoToday, monthBounds } from "./leaveDateMath";

/**
 * Loaders for the owner's Leave section: the fixed leave-type catalog on the
 * first tab, the whole-company requests with their approvals on the second,
 * and the month calendar of approved time off on the third. Each tab fetches
 * only its own data — a tab change is navigation, so nothing the user is not
 * looking at is asked of the backend.
 */

export type LeaveTab = "types" | "requests" | "calendar";
export type LeaveFail = { state: "failed"; tab: LeaveTab };

/** The open detail panel's data: the request itself plus the employee's
 *  balances. `balances: null` = the balances read failed (the request still
 *  shows — the panel says the balance could not be loaded). */
export type LeaveSelection = {
  request: LeaveRow;
  balances: LeaveBalanceRow[] | null;
};

export type LeaveData =
  | { state: "ok"; tab: "types"; rows: LeaveTypeRow[]; selfName: string | null }
  | {
      state: "ok";
      tab: "requests";
      status: LeaveStatusFilter;
      cursor: string;
      selected: string;
      page: Page<LeaveRow>;
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
  /** The keyset cursor the backend handed back; "" = first page. */
  cursor: string;
  /** The open detail panel's request id; "" = panel closed. */
  selected: string;
};

/** Reads the requests-tab address into filters; anything unknown falls back
 *  to its default, so a hand-edited URL never breaks the page. A cursor is
 *  opaque — it is only trimmed and capped, never interpreted. */
export function readLeaveFilters(params: URLSearchParams): LeaveFilters {
  const rawStatus = params.get("status") ?? "";
  const rawCursor = params.get("cursor") ?? "";
  const rawSelected = params.get("selected") ?? "";
  return {
    status: LEAVE_STATUS_SET.has(rawStatus) ? (rawStatus as LeaveStatusFilter) : "all",
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

/** Resolves the `selected` param into the panel's data: the request must be
 *  on the loaded page (a stale id — decided elsewhere, another filter — just
 *  closes the panel), and its balances come from the employee read. A failed
 *  balances read degrades to `balances: null` — the request still shows —
 *  while an auth failure propagates to the loader's login redirect. */
async function resolveSelection(
  token: string,
  selected: string,
  page: Page<LeaveRow>,
  signal: AbortSignal,
): Promise<LeaveSelection | null> {
  if (selected === "") return null;
  const request = page.data.find((row) => row.id === selected);
  if (request === undefined) return null;
  try {
    const balances = await fetchLeaveBalances(token, request.employeeId, signal);
    return { request, balances };
  } catch (error) {
    if (isAuthError(error)) throw error;
    if (signal.aborted) throw error;
    return { request, balances: null };
  }
}

/** The summary read is degrade-able — the pulse's capacity fact, nothing
 *  else. A non-auth failure (the route not deployed yet, a 500) costs the
 *  availability meter only; the grid, timeline and rail cards stay. An
 *  auth failure still propagates to the loader's login redirect, and an
 *  aborted request rethrows so React Router can move on. */
async function readSummaryOrNull(token: string, signal: AbortSignal): Promise<LeaveSummary | null> {
  try {
    return await fetchLeaveSummary(token, signal);
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
      const page = await fetchLeavePage(
        token,
        {
          limit: LEAVE_PAGE_SIZE,
          ...(filters.status !== "all" ? { status: filters.status } : {}),
          ...(filters.cursor !== "" ? { cursor: filters.cursor } : {}),
        },
        request.signal,
      );
      const selection = await resolveSelection(token, filters.selected, page, request.signal);
      return {
        state: "ok",
        tab,
        status: filters.status,
        cursor: filters.cursor,
        selected: filters.selected,
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
      if (intent === "approve") {
        await approveLeave(token, id, request.signal);
        return { kind: "approve", state: "done" };
      }
      if (intent === "reject") {
        const reason = stringField(form, "reason").slice(0, 500);
        await rejectLeave(token, id, reason, request.signal);
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
