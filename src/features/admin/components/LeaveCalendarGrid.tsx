import type { LeaveRow } from "../companyApi";
import { monthCells, weekdayOf } from "../leaveDateMath";
import styles from "./LeaveCalendarGrid.module.css";

/** Names shown per day cell before the "+N more" line takes over — the
 *  cells stay one line tall per person, never a scroll area. */
const NAMES_PER_CELL = 2;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** The month grid: Sunday-first, one cell per day, each naming who is out.
 *  A day with anyone away is a button that opens the day's drill-down; an
 *  empty day is an honest empty cell. Today carries an outline, weekends
 *  and tenant holidays a tint. No grid roles — the cells are laid out by
 *  CSS without row wrappers, and a role="grid" without rows is a promise
 *  (arrow-key cell navigation) the layout does not keep. */
export function LeaveCalendarGrid({
  month,
  byDate,
  holidayNames,
  today,
  openDay,
}: {
  month: string;
  byDate: Map<string, LeaveRow[]>;
  holidayNames: Map<string, string>;
  today: string;
  openDay: (date: string) => void;
}) {
  const cells = monthCells(month);
  return (
    <div className={styles.grid} aria-label={`Leave calendar, ${month}`}>
      {WEEKDAYS.map((name) => (
        <div key={name} className={styles.weekday}>
          {name}
        </div>
      ))}
      {cells.map((cell, index) => {
        if (cell === null) return <div key={`blank-${index}`} className={styles.blank} />;
        const people = byDate.get(cell.date) ?? [];
        const holiday = holidayNames.get(cell.date);
        const weekend = weekdayOf(cell.date) === 0 || weekdayOf(cell.date) === 6;
        const shown = people.slice(0, NAMES_PER_CELL);
        const rest = people.length - shown.length;
        const inner = (
          <>
            <span className={styles.dayNumber}>
              {cell.day}
              {holiday ? <span className={styles.holidayName}>{holiday}</span> : null}
            </span>
            {shown.map((person) => (
              <span key={person.id} className={styles.person}>
                {person.employeeName ?? person.employeeCode ?? "Unknown"}
              </span>
            ))}
            {rest > 0 ? <span className={styles.more}>+{rest} more</span> : null}
          </>
        );
        return people.length > 0 ? (
          <button
            key={cell.date}
            type="button"
            className={styles.day}
            data-weekend={weekend || undefined}
            data-holiday={holiday !== undefined || undefined}
            data-today={today === cell.date || undefined}
            aria-label={dayCellLabel(cell.date, shown, rest)}
            onClick={() => openDay(cell.date)}
          >
            {inner}
          </button>
        ) : (
          <div
            key={cell.date}
            className={styles.day}
            data-weekend={weekend || undefined}
            data-holiday={holiday !== undefined || undefined}
            data-today={today === cell.date || undefined}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** The occupied day's accessible name: who is away, not just how many —
 *  a screen reader hears the same names the cell shows. */
function dayCellLabel(date: string, shown: LeaveRow[], rest: number): string {
  const names = shown.map((person) => person.employeeName ?? person.employeeCode ?? "Unknown");
  const more = rest > 0 ? ` +${rest} more` : "";
  return `${date}: ${names.join(", ")}${more} away`;
}
