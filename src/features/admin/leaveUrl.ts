import type { LeaveFilters } from "./leaveLoaders";

export const LEAVE_PATH = "/admin/company/leave";

/** The calendar tab's address for a month ("YYYY-MM"); "" re-reads the
 *  current month. */
export function leaveCalendarUrl(month: string): string {
  return month === ""
    ? `${LEAVE_PATH}?tab=calendar`
    : `${LEAVE_PATH}?tab=calendar&month=${encodeURIComponent(month)}`;
}

/** Builds the requests tab's address for a filter, pager or panel change.
 *  Every caller states what changed and the rest carries over from
 *  `filters` — a status or cursor change restarts the walk (a cursor belongs
 *  to one filter's page) and drops the open panel (a selection belongs to
 *  one filtered view of one walk), while defaults stay out of the URL. */
export function leaveRequestsUrl(filters: LeaveFilters, changes: Partial<LeaveFilters>): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams({ tab: "requests" });
  if (next.status !== "all") params.set("status", next.status);
  if (next.cursor !== "") params.set("cursor", next.cursor);
  if (next.selected !== "") params.set("selected", next.selected);
  const query = params.toString();
  return `${LEAVE_PATH}?${query}`;
}
