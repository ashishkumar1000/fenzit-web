import { AlignLeft, CalendarDays, Check } from "lucide-react";
import type { LeaveRow } from "../companyApi";
import {
  daysUntil,
  monthDay,
  nextWorkingDay,
  shiftDay,
  shortRange,
  weekdayOf,
} from "../leaveDateMath";
import { typeTag } from "../leaveTypeUi";
import { Avatar } from "./Avatar";
import styles from "./LeaveTimeline.module.css";

/** The upcoming window's three honest buckets, anchored on today — the
 *  design's This Week / Next Week plus a catch-all "Later", so a leave
 *  five weeks out still lands somewhere true. */
export interface TimelineGroups {
  thisWeek: LeaveRow[];
  nextWeek: LeaveRow[];
  later: LeaveRow[];
}

export function groupUpcoming(rows: LeaveRow[], today: string): TimelineGroups {
  const nextWeekEnd = shiftDay(today, 13);
  const groups: TimelineGroups = { thisWeek: [], nextWeek: [], later: [] };
  for (const row of [...rows].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    if (row.startDate <= shiftDay(today, 6)) groups.thisWeek.push(row);
    else if (row.startDate <= nextWeekEnd) groups.nextWeek.push(row);
    else groups.later.push(row);
  }
  return groups;
}

/** The design's return/starts line, computed honestly from the span:
 *  a future span counts down to its start; an ongoing one names the day
 *  the person is back (the next working day after their last day). */
function backOrStarts(row: LeaveRow, today: string): string {
  if (row.startDate > today) {
    const until = daysUntil(today, row.startDate);
    if (until === 0) return "Starts today";
    if (until === 1) return "Starts tomorrow";
    return `Starts in ${until} days`;
  }
  if (row.endDate === today) {
    // "Back tomorrow" only when tomorrow is a working day — a leave ending
    // Friday returns Monday, and the line must not promise a Saturday.
    const weekend = weekdayOf(shiftDay(today, 1)) === 0 || weekdayOf(shiftDay(today, 1)) === 6;
    return weekend ? `Back on ${monthDay(nextWorkingDay(today))}` : "Back tomorrow";
  }
  return `Back on ${monthDay(nextWorkingDay(row.endDate))}`;
}

/** The timeline view of the "Upcoming Leaves" tab: the approved requests
 *  of the upcoming window, bucketed This Week / Next Week / Later — each
 *  a person card with their type pill, EMP • office line, the span with
 *  its working-day count, the note, and the return line. Read-only:
 *  everything here is already approved. */
export function LeaveTimeline({ groups, today }: { groups: TimelineGroups; today: string }) {
  const sections = [
    { key: "thisWeek", label: "This Week", rows: groups.thisWeek },
    { key: "nextWeek", label: "Next Week", rows: groups.nextWeek },
    { key: "later", label: "Later", rows: groups.later },
  ] as const;
  return (
    <div className={styles.timeline} aria-label="Upcoming leave timeline">
      {sections.map((section) =>
        section.rows.length === 0 ? null : (
          <section key={section.key} className={styles.group} aria-label={section.label}>
            <header className={styles.groupHead}>
              <span className={styles.groupDot} aria-hidden="true" />
              <h4 className={styles.groupLabel}>{section.label}</h4>
              <span className={styles.groupCount}>
                {`${section.rows.length} ${section.rows.length === 1 ? "leave" : "leaves"} scheduled`}
              </span>
            </header>
            <ul className={styles.cards}>
              {section.rows.map((row) => (
                <TimelineCard key={row.id} row={row} today={today} />
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}

function TimelineCard({ row, today }: { row: LeaveRow; today: string }) {
  const name = row.employeeName ?? row.employeeCode ?? "Unknown";
  return (
    <li className={styles.card}>
      <span className={styles.face}>
        <Avatar name={row.employeeName ?? null} imageUrl={row.employeeAvatarUrl} />
      </span>
      <div className={styles.body}>
        <div className={styles.nameRow}>
          <span className={styles.personName}>{name}</span>
          {row.leaveTypeName !== undefined ? (
            <span className={styles.typePill} data-code={row.leaveTypeCode}>
              <span className={styles.typeDot} aria-hidden="true" />
              {row.leaveTypeName}
            </span>
          ) : null}
        </div>
        <span className={styles.metaLine}>
          {row.employeeCode ?? ""}
          {row.officeName !== undefined ? ` • ${row.officeName}` : ""}
        </span>
        <div className={styles.spanRow}>
          <CalendarDays size={12} className={styles.spanGlyph} aria-hidden="true" />
          <span className={styles.spanRange}>
            {`${shortRange(row.startDate, row.endDate)} · ${row.workingDays} ${row.workingDays === 1 ? "day" : "days"}`}
          </span>
          <span className={styles.approvedChip}>
            <Check size={10} aria-hidden="true" />
            Approved
          </span>
        </div>
        {row.reason === "" ? null : (
          <p className={styles.note}>
            <AlignLeft size={12} aria-hidden="true" />
            <span>{row.reason}</span>
          </p>
        )}
        <span className={styles.returnLine}>{backOrStarts(row, today)}</span>
      </div>
      {row.leaveTypeName !== undefined ? (
        <span className={styles.sideTag} data-code={row.leaveTypeCode}>
          {typeTag(row.leaveTypeName)}
        </span>
      ) : null}
    </li>
  );
}
