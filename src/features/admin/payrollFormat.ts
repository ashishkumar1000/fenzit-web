/**
 * Money and month helpers for the payroll config surfaces. The BE carries
 * money as exact 2dp text ("20000.00"); the console shows rupees and sends
 * the text back normalized, so a display re-format never touches a stored
 * figure.
 */

const RUPEES = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "20000.00" → "₹20,000.00". Unparseable text renders as given — the BE's
 *  money text is trusted at the boundary and never silently rewritten. */
export function fmtMoney(text: string): string {
  const value = Number(text);
  if (!Number.isFinite(value)) return text;
  return RUPEES.format(value);
}

/** "20000" / "20,000" / "20000.5" → "20000.00", or null when the field does
 *  not carry a usable non-negative amount. The dialogs call this right
 *  before send; the wire never sees a display string. */
export function normalizeMoney(raw: string): string | null {
  const cleaned = raw.replace(/[,\s₹]/g, "");
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned).toFixed(2);
}

/** A formula line's percent, clamped to the builder's UI bound (0 < p ≤ 100)
 *  with two decimals — a UI rule; the BE validates the wider AST shape. The
 *  bound is re-checked AFTER rounding: "0.001" rounds to 0, and a zeroed
 *  percent must not ride the wire looking valid. */
export function normalizePercent(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 100) return null;
  const rounded = Number(value.toFixed(2));
  return rounded <= 0 ? null : rounded;
}

/** A YYYY-MM month as the owner reads it — "October 2026". Shared by the
 *  Runs panel and the run watcher's toasts, so a month never reads two ways. */
export function fmtMonthHead(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return month;
  return new Date(year, mon - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
