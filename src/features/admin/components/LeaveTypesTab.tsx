import { useState } from "react";
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

/** The types tab, the design's master-detail: a summary-card row on top
 *  (click a card to edit), the selected type's rules editor below, and a
 *  rates rail beside them. Every editor stays mounted — only the selected
 *  one is visible — so an unsaved edit survives a card switch instead of
 *  silently vanishing. Legacy remnants stay read-only below the cards. */
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
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.cardRow}>
          {configurable.map(({ row }) => (
            <button
              key={row.id}
              type="button"
              className={row === selected?.row ? styles.cardActive : styles.card}
              aria-pressed={row === selected?.row}
              onClick={() => setSelectedId(row.id)}
            >
              <span className={styles.cardName}>{row.name}</span>
              <span className={styles.cardRate}>{rateSummary(row)}</span>
              <span className={styles.cardMeta}>
                <span className={styles.cardMode}>
                  {MODE_CHIP[row.accrualMode ?? ""] ?? "Legacy"}
                </span>
                {row.enabled ? null : <span className={styles.cardOff}>Turned off</span>}
              </span>
            </button>
          ))}
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
      <aside className={styles.rail}>
        <SectionCard title="Rates">
          <ul className={styles.rates}>
            {configurable.map(({ row }) => (
              <li key={row.id} className={styles.ratesRow}>
                <span className={row.enabled ? undefined : styles.ratesOff}>{row.name}</span>
                <strong>{rateSummary(row)}</strong>
              </li>
            ))}
          </ul>
        </SectionCard>
      </aside>
    </div>
  );
}
