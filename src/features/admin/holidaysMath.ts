import type { HolidayRow } from "./companyApi";
import { daysUntil, weekdayOf } from "./leaveDateMath";

/**
 * Pure holiday math for the redesigned console pages (2026-11-26) — the
 * holiday-specific layer over leaveDateMath, same contract: ISO dates and
 * plain calendar labels on every surface, no Date objects out, so each
 * answer is testable without a locale or timezone in play.
 *
 * The long-break rule is deliberately CLIENT-side (the ledger cut, owner
 * approved 2026-11-26): a long break is a run of THREE OR MORE consecutive
 * off-days, where a day is off when the tenant's weekly-off default covering
 * it names that weekday OR a holiday lands on it. A tenant with no weekly
 * offs gets no section at all — the concept does not exist for them.
 */

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
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

/** "2026-11-08" → "Nov 08" — the observed-date block's month line. */
export function monthShort(date: string): string {
  return MONTH_SHORT[Number(date.slice(5, 7)) - 1] ?? date;
}

/** "2026-11-08" → "Sunday" — the schedule's weekday line. */
export function weekdayNameOf(date: string): string {
  return WEEKDAY_NAMES[weekdayOf(date)];
}

export interface LongWeekend {
  /** The holidays inside the break, date order (usually exactly one). */
  holidays: HolidayRow[];
  /** "4 Days Off" — the whole consecutive off-run's length. */
  label: string;
  /** The extended window's first/last day, e.g. Fri 6 Nov – Sun 8 Nov. */
  start: string;
  end: string;
}

/** One `attendance_weekly_off_defaults` row as the overview ships it: a
 *  Postgres daterange text (`[2026-01-01,)`) plus the off weekdays — ISO
 *  1=Mon … 7=Sun, the attendance engine's convention (NOT JS's 0=Sun).
 *  Empty days = the tenant runs NO weekly off while this range is valid. */
export type WeeklyOffDefault = { valid: string; days: number[] };

/** Whether the tenant runs any weekly off at all DURING the viewed year —
 *  a row whose validity never touches the year (a weekly off removed
 *  before it began) must not summon the section. false is the "this
 *  section makes no sense here" owner rule. */
export function hasWeeklyOff(defaults: WeeklyOffDefault[], year: string): boolean {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  return defaults.some((d) => d.days.length > 0 && rangeOverlaps(d.valid, yearStart, yearEnd));
}

/** A half-open daterange text overlaps [yearStart, yearEnd] — string
 *  comparison on ISO labels; the exclusive upper is `> yearStart`, not >=. */
function rangeOverlaps(range: string, yearStart: string, yearEnd: string): boolean {
  const [lower, upper] = range.slice(1, -1).split(",");
  return (lower === "" || lower <= yearEnd) && (upper === "" || upper > yearStart);
}

/** Postgres daterange text → half-open [lower, upper) ISO bounds; an empty
 *  side is unbounded. Dateranges default to `[)` inclusive-exclusive, so
 *  `date < upper` is the right containment test. */
function coversDate(range: string, date: string): boolean {
  const [lower, upper] = range.slice(1, -1).split(",");
  return date >= (lower || "0000-01-01") && date < (upper || "9999-12-31");
}

/** The weekly-off weekdays in force on a date: defaults are a change
 *  history ordered by `valid`, so the LAST covering row wins — including a
 *  later empty-days row switching the weekly off off. */
function weeklyOffDaysFor(defaults: WeeklyOffDefault[], date: string): number[] {
  let days: number[] = [];
  for (const d of defaults) {
    if (coversDate(d.valid, date)) days = d.days;
  }
  return days;
}

/** ISO weekday (1=Mon … 7=Sun) — the convention the attendance engine's
 *  `isWeeklyOffDay`/`isoWeekdayOf` writes into attendance_weekly_off_defaults
 *  .days. The JS-style getUTCDay() (0=Sun) weekdayOf must NOT be used here:
 *  a Sunday weekly off is stored as 7, and checking it against 0 splits
 *  every weekend run (the November double-count incident, 2026-11-26). */
function isoWeekdayOf(date: string): number {
  return ((weekdayOf(date) + 6) % 7) + 1;
}

/** Whether the tenant's weekly off swallows this date — the calendar's
 *  weekend-cell material (the sunken cells with the exhale ornament). */
export function isWeeklyOffDate(defaults: WeeklyOffDefault[], date: string): boolean {
  return weeklyOffDaysFor(defaults, date).includes(isoWeekdayOf(date));
}

/**
 * The year's long breaks (owner-approved rule 2026-11-26, refined after the
 * November incident): a run of ≥3 consecutive off-days — weekly-off default
 * days plus holidays — where at least one holiday in the run falls on a day
 * that is NOT already a weekly off. A holiday swallowed whole by the weekly
 * off (Diwali on a Sunday) is just the regular weekend — it adds no day,
 * so it is not a long weekend; a Monday holiday bridging the Fri–Sun weekly
 * off is. Runs whose only glue is holidays of DISJOINT office scopes serve
 * no single office end-to-end and drop out (the "office-set overlap" rule);
 * weekly offs themselves are tenant-level, so every other run applies to
 * everyone the run's holidays cover.
 */
export function longWeekends(
  holidays: HolidayRow[],
  weeklyOffDefaults: WeeklyOffDefault[],
  year: string,
): LongWeekend[] {
  if (!hasWeeklyOff(weeklyOffDefaults, year)) return [];
  const holidayByDate = new Map(holidays.map((h) => [h.date, h]));
  const isOffDate = (date: string): boolean =>
    weeklyOffDaysFor(weeklyOffDefaults, date).includes(isoWeekdayOf(date)) ||
    holidayByDate.has(date);
  // The holiday must ADD a day the weekly off alone wouldn't give.
  const addsADay = (holiday: HolidayRow): boolean =>
    !weeklyOffDaysFor(weeklyOffDefaults, holiday.date).includes(isoWeekdayOf(holiday.date));

  // Pad the scan past both year edges so a Jan 1 holiday can inherit the
  // New Year's Eve weekend and a Dec 31 one the following days.
  const found: LongWeekend[] = [];
  let run: { start: string; end: string; days: number; holidays: HolidayRow[] } | null = null;
  const flush = () => {
    if (run && run.days >= 3 && run.holidays.some((h) => h.date.startsWith(year))) {
      const offices = runOffices(run.holidays);
      if ((offices === null || offices.length > 0) && run.holidays.some(addsADay)) {
        found.push({
          holidays: run.holidays,
          label: `${run.days} Days Off`,
          start: run.start,
          end: run.end,
        });
      }
    }
    run = null;
  };
  for (
    let date = shiftDay(`${year}-01-01`, -10);
    date <= shiftDay(`${year}-12-31`, 10);
    date = shiftDay(date, 1)
  ) {
    if (isOffDate(date)) {
      if (run) {
        run.end = date;
        run.days += 1;
      } else {
        run = { start: date, end: date, days: 1, holidays: [] };
      }
      const holiday = holidayByDate.get(date);
      if (holiday) run.holidays.push(holiday);
    } else {
      flush();
    }
  }
  flush();
  return found.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * The office set a run's holidays agree on: only 'offices'-scoped holidays
 * constrain it (an 'all' holiday closes everyone, so it adds no
 * restriction and is skipped); null when the run has none. Empty means the
 * scoped holidays are disjoint — no single office sees the whole break —
 * and the run drops.
 */
function runOffices(holidays: HolidayRow[]): string[] | null {
  let offices: string[] | null = null;
  for (const holiday of holidays) {
    if ((holiday.scope ?? "all") === "offices") {
      const ids = holiday.officeIds ?? [];
      offices = offices === null ? [...ids] : offices.filter((id) => ids.includes(id));
    }
  }
  return offices;
}

/** "2026-11-08" ± n days, rolling across months and years (UTC labels). */
function shiftDay(date: string, delta: number): string {
  const next = new Date(
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)) + delta,
    ),
  );
  return next.toISOString().slice(0, 10);
}

/** The design header's office line: "Official holidays for all N offices ·
 *  A, B & C" — the real office list, never hard-coded city names. */
export function holidaysOfficeLine(offices: { name: string }[]): string {
  const names = offices.map((o) => o.name);
  if (names.length === 0) return "Official holidays across your offices";
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`;
  return `Official holidays for all ${names.length} office${names.length === 1 ? "" : "s"} · ${list}`;
}

/** "In 4 days" / "In 2 weeks"-style banner copy from the shipped
 *  daysUntil — the banner's "IN 4 DAYS" block. */
export function countdownLabel(date: string, today: string): string {
  const days = daysUntil(today, date);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/**
 * The employees a holiday actually closes. The overview ships the real
 * date-anchored count (`employeesOff`) — same population as the inspector,
 * so the table and the sheet always agree. The client-side derivation from
 * TODAY's roster is only the fallback for rows that lack it (older
 * payloads): an 'all' holiday closes every tracked employee (all offices
 * plus the office-less staff); an 'offices' holiday closes the covered
 * offices' staff only.
 */
export function employeesOff(
  holiday: Pick<HolidayRow, "scope" | "officeIds" | "employeesOff">,
  offices: { officeId: string; staffCount: number }[],
  unassignedCount: number,
): number {
  // A null payload value must not reach toLocaleString — fall through to the
  // roster math instead (undefined OR null both count as "not provided").
  if (holiday.employeesOff != null) return holiday.employeesOff;
  const staffOf = new Map(offices.map((o) => [o.officeId, o.staffCount]));
  if ((holiday.scope ?? "all") === "all") {
    return offices.reduce((sum, o) => sum + o.staffCount, 0) + unassignedCount;
  }
  return (holiday.officeIds ?? []).reduce((sum, id) => sum + (staffOf.get(id) ?? 0), 0);
}

/**
 * The office chip a row shows: "All Offices" for an 'all' holiday, the
 * covered offices' names otherwise. Unknown ids (archived between reads)
 * drop out rather than rendering a blank chip; when none survive, the
 * holiday does NOT become "All Offices" — it says so honestly.
 */
export function officeLabel(
  holiday: Pick<HolidayRow, "scope" | "officeIds">,
  officeNames: Map<string, string>,
): string {
  if ((holiday.scope ?? "all") === "all") return "All Offices";
  const names = (holiday.officeIds ?? [])
    .map((id) => officeNames.get(id))
    .filter((name): name is string => name !== undefined);
  return names.length > 0 ? names.join(", ") : "Offices no longer listed";
}

/**
 * The .ics text the schedule's Export Calendar button downloads — one
 * all-day event per holiday (DTEND exclusive = the next day), UID pinned
 * to the holiday id so re-imports dedupe. Lines are deliberately NOT
 * RFC 5545-folded: names cap at 80 chars and every major parser tolerates
 * the over-length SUMMARY/DESCRIPTION lines.
 */
export function icsFor(holidays: HolidayRow[], stamp: Date): string {
  const utc = `${stamp.getUTCFullYear()}${String(stamp.getUTCMonth() + 1).padStart(2, "0")}${String(stamp.getUTCDate()).padStart(2, "0")}T${String(stamp.getUTCHours()).padStart(2, "0")}${String(stamp.getUTCMinutes()).padStart(2, "0")}${String(stamp.getUTCSeconds()).padStart(2, "0")}Z`;
  const events = holidays.map((holiday) => {
    const end = shiftDay(holiday.date, 1);
    const lines = [
      "BEGIN:VEVENT",
      `UID:${holiday.id}@holidays.fenzit.com`,
      `DTSTAMP:${utc}`,
      `DTSTART;VALUE=DATE:${holiday.date.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${end.replace(/-/g, "")}`,
      `SUMMARY:${escapeIcs(holiday.name)}`,
    ];
    if (holiday.description) lines.push(`DESCRIPTION:${escapeIcs(holiday.description)}`);
    lines.push("END:VEVENT");
    return lines.join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fenzit//Holiday Calendar//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** The .ics download the Export Calendar button fires (a plain blob link,
 *  no navigation). */
export function downloadIcs(holidays: HolidayRow[], year: string): void {
  const blob = new Blob([icsFor(holidays, new Date())], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `fenzit-holidays-${year}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}
