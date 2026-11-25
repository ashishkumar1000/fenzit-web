import type { LeaveRow } from "./companyApi";

/**
 * Pure date math for the Leave calendar tab — all functions take and return
 * tenant-local ISO dates ("YYYY-MM-DD") or months ("YYYY-MM"), never Date
 * objects on their surfaces, so every answer is testable without a locale
 * or timezone in play. Month arithmetic runs in UTC space, which is safe
 * because the inputs are plain calendar labels, not instants.
 */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** The viewer's local today as an ISO date. The console runs in the owner's
 *  browser — the same clock the tenant keeps — so local is the honest
 *  "today"; the backend never hands the list response a server date. */
export function localIsoToday(): string {
  return localIsoDate(new Date());
}

/** The viewer's local calendar day of an instant, as an ISO date — the same
 *  local clock localIsoToday reads, applied to a wire timestamp, so a
 *  "requested on" line shows the day the filer's clock said, not the UTC
 *  day an ISO string slices into. */
export function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isMonth(value: string): boolean {
  return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value);
}

function parts(month: string): { year: number; month: number } {
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) };
}

function isoOf(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** The month's first and last day — the 27-1 window a month query sends. */
export function monthBounds(month: string): { from: string; to: string } {
  const { year, month: m } = parts(month);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: isoOf(year, m, 1), to: isoOf(year, m, lastDay) };
}

/** The month's grid cells, Sunday-first: leading `null`s pad the first
 *  week, then one entry per real day — the calendar grid renders these
 *  directly. */
export function monthCells(month: string): Array<{ date: string; day: number } | null> {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const lead = new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay();
  const cells: Array<{ date: string; day: number } | null> = [];
  for (let blank = 0; blank < lead; blank += 1) cells.push(null);
  for (let day = 1; day <= lastDay; day += 1) {
    const m = String(monthIndex).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    cells.push({ date: `${year}-${m}-${d}`, day });
  }
  return cells;
}

/** "2026-11" ± n months, rolling across years. */
export function shiftMonth(month: string, delta: number): string {
  const { year, month: m } = parts(month);
  const total = year * 12 + (m - 1) + delta;
  return isoOf(Math.floor(total / 12), (total % 12) + 1, 1).slice(0, 7);
}

/** "2026-11" → "November 2026". */
export function monthLabel(month: string): string {
  const { year, month: m } = parts(month);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

/** "2026-11-17" → "17 Nov". */
export function shortDay(date: string): string {
  const m = Number(date.slice(5, 7));
  return `${Number(date.slice(8, 10))} ${MONTH_SHORT[m - 1] ?? date}`;
}

/** "2026-11-17" → "Nov 17" — the day stepper's chip reads month-first. */
export function monthDay(date: string): string {
  const m = Number(date.slice(5, 7));
  return `${MONTH_SHORT[m - 1] ?? date} ${Number(date.slice(8, 10))}`;
}

/** "2026-11-17" ± n days, rolling across months and years — the day
 *  stepper's walk. UTC math on plain calendar labels, like shiftMonth. */
export function shiftDay(date: string, delta: number): string {
  const next = new Date(
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)) + delta,
    ),
  );
  return next.toISOString().slice(0, 10);
}

/** A request's span in the compact shape the rails and modal carry:
 *  "17–20 Nov" inside one month, "28 Nov – 2 Dec" across months. */
export function shortRange(start: string, end: string): string {
  const startMonth = start.slice(5, 7);
  const endMonth = end.slice(5, 7);
  if (startMonth === endMonth && start.slice(0, 4) === end.slice(0, 4)) {
    return `${Number(start.slice(8, 10))}–${shortDay(end)}`;
  }
  return `${shortDay(start)} – ${shortDay(end)}`;
}

/** Sunday-first weekday of an ISO date: 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: string): number {
  return new Date(
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))),
  ).getUTCDay();
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** "2026-11-26" → "Thursday" — the holidays rail's row line. */
export function weekdayName(date: string): string {
  return WEEKDAY_NAMES[weekdayOf(date)];
}

/** The month's Monday–Friday count — the pulse card's capacity
 *  denominator: one working day per active employee per working day.
 *  Holidays are NOT subtracted (the honest meter states its own rule). */
export function workingDaysInMonth(month: string): number {
  let count = 0;
  for (const cell of monthCells(month)) {
    if (cell === null) continue;
    const weekday = weekdayOf(cell.date);
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

/** Whole days from `from` to `to` — negative when `to` is already past.
 *  The timeline's "Starts in N days" and "Back on" lines read it. */
export function daysUntil(from: string, to: string): number {
  const utcOf = (date: string) =>
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  return Math.round((utcOf(to) - utcOf(from)) / 86400000);
}

/** The calendar days of a request's span that fall inside `month`
 *  ("YYYY-MM") — the Monthly Pulse's "total days out" and the breakdown
 *  card's per-type days. A span that misses the month answers 0. */
export function daysInMonth(startDate: string, endDate: string, month: string): number {
  const { from, to } = monthBounds(month);
  const start = startDate < from ? from : startDate;
  const end = endDate > to ? to : endDate;
  if (start > end) return 0;
  const utcOf = (date: string) =>
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  return Math.round((utcOf(end) - utcOf(start)) / 86400000) + 1;
}

/** The day after `date`, skipping Saturday and Sunday — the modal's
 *  "back on" line. Holidays are NOT skipped (the client cannot know the
 *  tenant's weekly-off pattern beyond weekends). */
export function nextWorkingDay(date: string): string {
  let cursor = date;
  for (let steps = 0; steps < 7; steps += 1) {
    const next = new Date(
      Date.UTC(
        Number(cursor.slice(0, 4)),
        Number(cursor.slice(5, 7)) - 1,
        Number(cursor.slice(8, 10)) + 1,
      ),
    );
    cursor = next.toISOString().slice(0, 10);
    const weekday = weekdayOf(cursor);
    if (weekday !== 0 && weekday !== 6) return cursor;
  }
  return cursor;
}

/** One request's position within its own span: 1-based; 0 when the date is
 *  not one of the request's working dates. */
export function dayNumberOf(request: LeaveRow, date: string): number {
  const index = request.dates.findIndex((day) => day.date === date);
  return index + 1;
}

/** Expands the page's requests into the day cells the grid renders — only
 *  days whose own state is approved (a request can carry cancelled days
 *  even while its derived status is not). Rows keep first-seen order. */
export function groupApprovedByDate(rows: LeaveRow[]): Map<string, LeaveRow[]> {
  const byDate = new Map<string, LeaveRow[]>();
  for (const row of rows) {
    for (const day of row.dates) {
      if (day.state !== "approved") continue;
      const list = byDate.get(day.date);
      if (list === undefined) byDate.set(day.date, [row]);
      else if (!list.some((existing) => existing.id === row.id)) list.push(row);
    }
  }
  return byDate;
}
