import { ChevronRight, Eye, PartyPopper } from "lucide-react";
import type { LeaveRow } from "../companyApi";
import { dayNumberOf, monthCells, weekdayOf } from "../leaveDateMath";
import { typeTag } from "../leaveTypeUi";
import styles from "./LeaveCalendarGrid.module.css";

/** Names shown per day cell before the "+N more" line takes over — the
 *  cells stay one line tall per person, never a scroll area. */
const NAMES_PER_CELL = 2;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function nameOf(person: LeaveRow): string {
  return person.employeeName ?? person.employeeCode ?? "Unknown";
}

/** The month grid: Sunday-first, one cell per day. An occupied day shows
 *  the design's "N on leave" chip (tinted by the day's leave type when
 *  everyone is out for the same type) over "Name • TAG" lines, and opens
 *  the day's drill-down; an empty day is an honest empty cell. Today's
 *  cell speaks the span's position — filled number badge, Today chip, a
 *  solid chip with a view glyph, and a lone person's "Day N of M" line in
 *  place of the person lines (a lone line stays attributable). A lone
 *  person's last day says so in place of their line. A holiday shows the
 *  tenant's closure — the pill and the line swap content depending on
 *  whether leave shares the day, and the celebratory glyph marks both.
 *  No grid roles — the cells are laid out by CSS without row wrappers,
 *  and a role="grid" without rows is a promise (arrow-key cell
 *  navigation) the layout does not keep. */
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
      {WEEKDAYS.map((name, index) => (
        <div
          key={name}
          className={styles.weekday}
          data-weekend={index === 0 || index === 6 || undefined}
        >
          {name}
        </div>
      ))}
      {cells.map((cell, index) => {
        if (cell === null) return <div key={`blank-${index}`} className={styles.blank} />;
        const people = byDate.get(cell.date) ?? [];
        const shown = people.slice(0, NAMES_PER_CELL);
        const holiday = holidayNames.get(cell.date);
        const weekend = weekdayOf(cell.date) === 0 || weekdayOf(cell.date) === 6;
        const isToday = today === cell.date;
        const single = people.length === 1;
        const codes = new Set(
          people.map((person) => person.leaveTypeCode).filter((code) => code !== undefined),
        );
        // A shared tone needs everyone typed: a lone typed row next to
        // legacy (untyped) rows would otherwise tint the untyped names too.
        const allTyped = people.every((person) => person.leaveTypeCode !== undefined);
        const tone = allTyped && codes.size === 1 ? [...codes][0] : undefined;
        // The today cell speaks the span's position — but only when one
        // person is out, so the line stays attributable to someone.
        const dayProgress = isToday && single ? dayNumberOf(people[0], today) : 0;
        const lastDay = single && !isToday && people[0].endDate === cell.date;
        const holidayShared = holiday !== undefined && people.length > 0;
        const inner = (
          <>
            <span className={styles.dayHead}>
              <span className={styles.dayNumber} data-today={isToday || undefined}>
                {cell.day}
              </span>
              {isToday ? <span className={styles.todayChip}>Today</span> : null}
              {holiday ? (
                <PartyPopper size={12} className={styles.holidayGlyph} aria-hidden="true" />
              ) : null}
            </span>
            {holidayShared ? (
              <span className={styles.officeChip}>Office Closed</span>
            ) : holiday ? (
              <span className={styles.holidayChip}>{holiday}</span>
            ) : people.length > 0 ? (
              <span className={styles.chip} data-code={tone} data-today={isToday || undefined}>
                {people.length} on leave
                {isToday ? (
                  <Eye size={10} aria-hidden="true" />
                ) : (
                  <ChevronRight size={10} aria-hidden="true" />
                )}
              </span>
            ) : null}
            {holiday ? (
              <span className={styles.holidayLine}>
                {holidayShared
                  ? `${holiday} • ${people.length} ${people.length === 1 ? "Leave" : "Leaves"}`
                  : "Office Closed"}
              </span>
            ) : null}
            {dayProgress > 0 ? (
              <span className={styles.dayProgress}>
                {`Day ${dayProgress} of ${people[0].workingDays}`}
              </span>
            ) : people.length > 0 ? (
              shown.map((person) => {
                if (lastDay) {
                  return (
                    <span key={person.id} className={styles.lastDay} data-code={tone}>
                      Last day
                    </span>
                  );
                }
                // The "(Day N)" note only when one person is out — with a
                // crowd the line stays name • tag, never a number pile.
                const note =
                  single && !isToday && person.startDate !== person.endDate
                    ? ` (Day ${dayNumberOf(person, cell.date)})`
                    : "";
                return (
                  <span key={person.id} className={styles.person} data-code={tone}>
                    <span>{nameOf(person)}</span>
                    {person.leaveTypeName !== undefined ? (
                      <span
                        className={styles.personTag}
                      >{` • ${typeTag(person.leaveTypeName)}${note}`}</span>
                    ) : note !== "" ? (
                      <span className={styles.personTag}>{note}</span>
                    ) : null}
                  </span>
                );
              })
            ) : null}
            {people.length - shown.length > 0 ? (
              <span className={styles.more}>{`+${people.length - shown.length} more`}</span>
            ) : null}
          </>
        );
        return people.length > 0 ? (
          <button
            key={cell.date}
            type="button"
            className={styles.day}
            data-weekend={weekend || undefined}
            data-holiday={holiday !== undefined || undefined}
            data-today={isToday || undefined}
            aria-label={dayCellLabel(cell.date, people, holiday)}
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
            data-today={isToday || undefined}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** The occupied day's accessible name: who is away — and the closure —
 *  not just how many; a screen reader hears the same facts the cell
 *  shows. */
function dayCellLabel(date: string, people: LeaveRow[], holiday: string | undefined): string {
  const names = people.map(nameOf);
  const closure = holiday === undefined ? "" : ` — office closed for ${holiday}`;
  return `${date}: ${names.join(", ")} away${closure}`;
}
