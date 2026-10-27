export type BadgeTone = "done" | "progress" | "scheduled" | "cancelled" | "neutral";

/** Domain status → the design system's fixed status vocabulary. The word
 *  always ships with the colour, never colour alone. */
const TONES: Record<string, BadgeTone> = {
  active: "done",
  approved: "done",
  completed: "done",
  present: "done",
  ready: "done",
  succeeded: "done",
  in_progress: "progress",
  generating: "progress",
  half_day: "scheduled",
  invited: "scheduled",
  pending: "scheduled",
  queued: "scheduled",
  scheduled: "scheduled",
  upcoming: "scheduled",
  absent: "cancelled",
  cancelled: "cancelled",
  disabled: "cancelled",
  failed: "cancelled",
  rejected: "cancelled",
  removed: "cancelled",
  revoked: "cancelled",
  mocked: "cancelled",
};

export function toneForStatus(status: string): BadgeTone {
  return TONES[status] ?? "neutral";
}

/** `in_progress` → "In progress". */
export function humanize(raw: string): string {
  const words = raw.split("_").filter((w) => w.length > 0);
  if (words.length === 0) return raw;
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}
