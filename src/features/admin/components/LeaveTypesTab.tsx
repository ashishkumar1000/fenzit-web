import { useState } from "react";
import type { ComponentType } from "react";
import {
  AlarmClockCheck,
  ArrowDown,
  ChevronRight,
  Circle,
  CircleDot,
  Heart,
  Power,
  SlidersHorizontal,
  Umbrella,
  VenetianMask,
} from "lucide-react";
import type { LeaveTypeRow } from "../leaveApi";
import { LeaveTypeEditor } from "./LeaveTypeEditor";
import { SectionCard } from "./SectionCard";
import styles from "./LeaveTypesTab.module.css";

/** The catalog's stable display order: earned, sick, bereavement, comp-off —
 *  the seed's order, not the alphabetical one the API answers with. Unknown
 *  codes (a future type) keep alphabetical order behind these. */
const CODE_ORDER = ["earned", "sick", "bereavement", "comp_off"];

function rankByCode(row: LeaveTypeRow, index: number): number {
  const rank = CODE_ORDER.indexOf(row.code ?? "");
  return rank === -1 ? CODE_ORDER.length + index : rank;
}

/** The card's one-line rate: monthly types show the annualized figure the
 *  design's cards carry (1 day/mo reads "12 days / year"), annual types the
 *  grant, comp-off "As earned". */
function rateSummary(row: LeaveTypeRow): string {
  const trim = (value: number) => String(Number(value.toFixed(2)));
  if (row.accrualMode === "monthly") return `${trim(row.accrualDays * 12)} days / year`;
  if (row.accrualMode === "annual") return `${trim(row.accrualDays)} days / year`;
  return "As earned";
}

const MODE_CHIP: Record<string, string> = {
  monthly: "Monthly accrual",
  annual: "Annual grant",
  none: "Event basis",
};

/** The design's per-type tile icons — an umbrella for earned days, a mask
 *  for sick, a heart for bereavement, a checked clock for comp-off. */
const CODE_GLYPH: Record<string, ComponentType<{ size?: number }>> = {
  earned: Umbrella,
  sick: VenetianMask,
  bereavement: Heart,
  comp_off: AlarmClockCheck,
};

/** The types tab — the design's master-detail. The four type cards carry
 *  everything at a glance: the tile icon, an Editing-Now / Click-to-Edit
 *  badge, the days-per-year summary beside the mode chip, and a footer that
 *  reads Active Policy (or Turned Off) on the selected card, "Switch to …"
 *  on the rest; the selected card's notch points at its editor below. Every
 *  editor stays mounted — only the selected one is visible — so an unsaved
 *  edit survives a card switch instead of silently vanishing. Legacy
 *  remnants stay read-only below the cards. */
export function LeaveTypesTab({ rows }: { rows: LeaveTypeRow[] }) {
  const byRank = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => rankByCode(a.row, a.index) - rankByCode(b.row, b.index));
  const configurable = byRank.filter((entry) => entry.row.configurable);
  const remnants = byRank.filter((entry) => !entry.row.configurable);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = configurable.find((entry) => entry.row.id === selectedId) ?? configurable[0];

  if (configurable.length === 0 && remnants.length === 0) {
    return (
      <SectionCard title="Leave types">
        <p className={styles.empty}>
          No leave types yet. The four fixed types appear once the company enables attendance.
        </p>
      </SectionCard>
    );
  }

  return (
    <div className={styles.main}>
      <div className={styles.cardRow}>
        {configurable.map(({ row }) => {
          const active = row === selected?.row;
          const Glyph = CODE_GLYPH[row.code ?? ""] ?? Umbrella;
          return (
            <button
              key={row.id}
              type="button"
              className={`${active ? styles.cardActive : styles.card}${row.enabled ? "" : ` ${styles.cardOff}`}`}
              aria-pressed={active}
              onClick={() => setSelectedId(row.id)}
            >
              <span className={styles.cardTop}>
                <span className={active ? styles.glyphActive : styles.glyph} aria-hidden="true">
                  <Glyph size={16} />
                </span>
                <span className={active ? styles.badgeEditing : styles.badgeEdit}>
                  {active ? (
                    <CircleDot size={11} aria-hidden="true" />
                  ) : (
                    <Circle size={11} aria-hidden="true" />
                  )}
                  {active ? "Editing Now" : "Click to Edit"}
                </span>
              </span>
              <span className={styles.cardName}>{row.name}</span>
              <span className={styles.cardMeta}>
                <span className={styles.cardRate}>{rateSummary(row)}</span>
                <span
                  className={row.accrualMode === "none" ? styles.cardModeEvent : styles.cardMode}
                >
                  {MODE_CHIP[row.accrualMode ?? ""] ?? "Legacy"}
                </span>
              </span>
              <span className={styles.cardFoot}>
                {active ? (
                  <>
                    <span className={row.enabled ? styles.footPolicy : styles.footOff}>
                      {row.enabled ? (
                        <SlidersHorizontal size={13} aria-hidden="true" />
                      ) : (
                        <Power size={13} aria-hidden="true" />
                      )}
                      {row.enabled ? "Active Policy" : "Turned Off"}
                    </span>
                    <ArrowDown size={14} className={styles.footArrow} aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span className={styles.footSwitch}>Switch to {row.name}</span>
                    <ChevronRight size={14} className={styles.footChevron} aria-hidden="true" />
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {remnants.length > 0 ? (
        <p className={styles.remnants}>
          Kept for history, not editable: {remnants.map(({ row }) => row.name).join(", ")}.
        </p>
      ) : null}
      {selected ? (
        <div className={styles.editors}>
          {configurable.map(({ row }) => (
            <div key={row.id} hidden={row !== selected.row}>
              <LeaveTypeEditor type={row} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
