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
