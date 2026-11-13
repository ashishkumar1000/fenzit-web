/** Display formatting for the console. The wire carries ISO timestamps and
 *  YYYY-MM-DD dates; every rendering decision lives here so the sections
 *  stay declarative. */

const WHEN = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const DAY = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** An ISO timestamp as "19 Oct, 3:24 pm". Null-safe: "—" when unknown. */
export function fmtWhen(iso: string | null): string {
  if (iso === null) return "—";
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "—" : WHEN.format(at);
}

const IST_DAY = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** A UTC instant shown as a day in India time (subscription end dates). */
export function fmtIstDay(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : IST_DAY.format(at);
}

/** The India-time calendar day of a UTC instant, as YYYY-MM-DD for a date field. */
export function istDateInput(iso: string | null): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(at);
}

/** Today's calendar date in IST, as YYYY-MM-DD. Report windows are IST days
 *  on the server, so the client builds its preset windows with these helpers
 *  instead of the browser's local clock. */
const IST_DATE_INPUT = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function istToday(): string {
  return IST_DATE_INPUT.format(new Date());
}

/** The IST calendar date `days` days from now (negative for the past). */
export function istShifted(days: number): string {
  return IST_DATE_INPUT.format(new Date(Date.now() + days * 86400000));
}

/** The first day of an IST month, `offset` months from the current one. */
export function istFirstOfMonth(offset = 0): string {
  const [year, month] = istToday().split("-").map(Number);
  const shifted = month - 1 + offset;
  const nextYear = year + Math.floor(shifted / 12);
  const nextMonth = (((shifted % 12) + 12) % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

/** The last day of the IST month before the current one. */
export function istEndOfLastMonth(): string {
  const [year, month] = istToday().split("-").map(Number);
  // Midnight UTC of the first of this month minus one day is the last day of
  // the previous month; formatting it in UTC keeps the calendar day exact.
  const day = new Date(Date.UTC(year, month - 1, 0));
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(day);
}

/** A YYYY-MM-DD date as "19 Oct 2026". Anything else passes through. */
export function fmtDay(day: string): string {
  const at = new Date(`${day}T00:00:00`);
  return Number.isNaN(at.getTime()) ? day : DAY.format(at);
}

/** A phone in the +91 98765 43210 shape the app shows everywhere. */
export function fmtPhone(countryCode: string, phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  const grouped = digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
  return `+${countryCode.replace("+", "")} ${grouped}`;
}

/** Metres as a person reads them: whole metres below a kilometre, one decimal
 *  in kilometres above. */
export function fmtDistance(metres: number | null): string {
  if (metres === null) return "—";
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

/** Postgres daterange text (`{2026-10-23}` or `{2026-10-23,2026-10-25}`, with
 *  any bracket style) as readable date(s). */
export function fmtDateRange(text: string | null): string {
  if (text === null) return "—";
  const inner = text
    .replace(/^[{[]/, "")
    .replace(/[}\]]$/, "")
    .trim();
  if (inner === "") return "—";
  const days = inner.split(",").map((part) => fmtDay(part.trim()));
  return days.length >= 2 ? `${days[0]} – ${days[1]}` : days[0];
}
