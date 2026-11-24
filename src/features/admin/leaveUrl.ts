import type { LeaveFilters } from "./leaveLoaders";

export const LEAVE_PATH = "/admin/company/leave";

/** The calendar tab's address for a month ("YYYY-MM"); "" re-reads the
 *  current month. */
export function leaveCalendarUrl(month: string): string {
  return month === ""
    ? `${LEAVE_PATH}?tab=calendar`
    : `${LEAVE_PATH}?tab=calendar&month=${encodeURIComponent(month)}`;
}

/** Builds the requests tab's address for a filter, search, month, pager or
 *  card change. Every caller states what changed and the rest carries over
 *  from `filters` — a filter change restarts the walk (a cursor belongs to
 *  one filter's page), while defaults stay out of the URL. The selected
 *  card follows the callers: a filter/search/month change drops it, a row
 *  tap sets it. */
export function leaveRequestsUrl(filters: LeaveFilters, changes: Partial<LeaveFilters>): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams({ tab: "requests" });
  if (next.status !== "all") params.set("status", next.status);
  if (next.q !== "") params.set("q", next.q);
  if (next.month !== "") params.set("month", next.month);
  if (next.cursor !== "") params.set("cursor", next.cursor);
  if (next.selected !== "") params.set("selected", next.selected);
  const query = params.toString();
  return `${LEAVE_PATH}?${query}`;
}
