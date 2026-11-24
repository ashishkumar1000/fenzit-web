import { useId, useMemo, useState } from "react";
import {
  AlignLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LeaveRow } from "../companyApi";
import { buildTypeGroups, typeShort, typeTag } from "../leaveTypeUi";
import { Avatar } from "./Avatar";
import { dayNumberOf, monthDay, nextWorkingDay, shiftDay, shortRange } from "../leaveDateMath";
import { fmtDayLong, fmtDayWithWeekday } from "../format";
import dialogStyles from "./JobSettingsDialog.module.css";
import styles from "./LeaveDayModal.module.css";

/** One person card in the day modal — the design's card: face with the
 *  presence dot, name, status chip, EMP-code chip, the type pill, the
 *  duration block (range with its day count, the return-date chip, the
 *  viewed day's position), then the note. "Day N of M" counts the VIEWED
 *  day within the span's working days — the card is about that day, not
 *  about now — and "(Active Today)" marks it when the viewed day is
 *  today. */
function PersonCard({
  person,
  today,
  viewDate,
}: {
  person: LeaveRow;
  today: string;
  viewDate: string;
}) {
  const name = person.employeeName ?? person.employeeCode ?? "Unknown";
  const dayNumber = dayNumberOf(person, viewDate);
  const spoken = viewDate === today;
  const single = person.startDate === person.endDate;
  const dayLine = single
    ? spoken
      ? "Single Day Leave (Today only)"
      : "Single Day Leave"
    : dayNumber > 0
      ? `Day ${dayNumber} of ${person.workingDays}${spoken ? " (Active Today)" : ""}`
      : null;
  const statusChip = person.status.charAt(0).toUpperCase() + person.status.slice(1);
  return (
    <li className={styles.personCard}>
      <div className={styles.cardHead}>
        <span className={styles.face}>
          <Avatar name={person.employeeName ?? null} imageUrl={person.employeeAvatarUrl} />
        </span>
        <div className={styles.personId}>
          <div className={styles.nameRow}>
            <span className={styles.personName}>{name}</span>
            <span className={styles.statusChip}>{statusChip}</span>
          </div>
          {person.employeeCode ? (
            <span className={styles.codeChip}>{person.employeeCode}</span>
          ) : null}
        </div>
        {person.leaveTypeName !== undefined ? (
          <span className={styles.typePill} data-code={person.leaveTypeCode}>
            <span className={styles.typeDot} aria-hidden="true" />
            {person.leaveTypeName} ({typeTag(person.leaveTypeName)})
          </span>
        ) : null}
      </div>
      <div className={styles.duration}>
        <span className={styles.durationLabel}>Duration &amp; Timeline</span>
        <div className={styles.durationRow}>
          <span className={styles.durationRange}>
            {`${shortRange(person.startDate, person.endDate)} (${person.totalDays} ${person.totalDays === 1 ? "day" : "days"})`}
          </span>
          <span className={styles.returnChip}>
            Return Date: {fmtDayWithWeekday(nextWorkingDay(person.endDate))}
          </span>
        </div>
        {dayLine === null ? null : (
          <span className={styles.dayLine} data-live={spoken || undefined}>
            {dayLine}
          </span>
        )}
      </div>
      {person.reason === "" ? null : (
        <p className={styles.note}>
          <AlignLeft size={13} aria-hidden="true" />
          <span>Note: {person.reason}</span>
        </p>
      )}
    </li>
  );
}

/** The day drill-down (design's day-detail-modal.jpg): a dated header —
 *  glyph tile, Today chip, the away count and all-approved pills, the
 *  out-by-type chips, and a ‹ day › stepper that walks neighbouring days
 *  (a day nobody covers answers honestly empty) — then type filter pills
 *  with person search, the design's person cards, and the footer's
 *  approval count and Done. Read-only: everyone listed is approved for
 *  the viewed day. */
export function LeaveDayModal({
  date,
  byDate,
  today,
  close,
}: {
  date: string;
  byDate: Map<string, LeaveRow[]>;
  today: string;
  close: () => void;
}) {
  const titleId = useId();
  const [viewDate, setViewDate] = useState(date);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const people = useMemo(() => byDate.get(viewDate) ?? [], [byDate, viewDate]);
  const filtered =
    typeFilter === null ? people : people.filter((person) => person.leaveTypeId === typeFilter);
  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      needle === ""
        ? filtered
        : filtered.filter((person) =>
            `${person.employeeName ?? ""} ${person.employeeCode ?? ""}`
              .toLowerCase()
              .includes(needle),
          ),
    [filtered, needle],
  );
  const approvedCount = people.filter((person) => person.status === "approved").length;
  const typeGroups = useMemo(() => buildTypeGroups(people), [people]);

  const step = (delta: number) => {
    setViewDate(shiftDay(viewDate, delta));
    setQuery("");
    setTypeFilter(null);
  };

  const filteredAway = needle !== "" || typeFilter !== null;

  return (
    <div className={styles.frame}>
      <header className={styles.head}>
        <span className={styles.headGlyph} aria-hidden="true">
          <CalendarDays size={20} />
        </span>
        <div className={styles.headText}>
          <div className={styles.titleRow}>
            <h3 id={titleId} className={styles.title}>
              Leaves on {fmtDayLong(viewDate)}
            </h3>
            {viewDate === today ? <span className={styles.todayChip}>Today</span> : null}
          </div>
          <div className={styles.subRow}>
            {people.length > 0 ? (
              <span className={styles.countPill}>
                <span className={styles.countDot} aria-hidden="true" />
                {people.length}{" "}
                {people.length === 1 ? "team member is on leave" : "team members are on leave"}
              </span>
            ) : null}
            {people.length > 0 && approvedCount === people.length ? (
              <span className={styles.donePill}>
                <Check size={12} aria-hidden="true" />
                All Approved
              </span>
            ) : null}
          </div>
        </div>
        <div className={styles.headEnd}>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.step}
              aria-label="Previous day"
              onClick={() => step(-1)}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span className={styles.stepDay}>{monthDay(viewDate)}</span>
            <button
              type="button"
              className={styles.step}
              aria-label="Next day"
              onClick={() => step(1)}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
          <button type="button" className={styles.close} aria-label="Close" onClick={close}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      {people.length > 0 && typeGroups.length > 0 ? (
        <div className={styles.outRow}>
          <span className={styles.outLabel}>
            <span className={styles.outDot} aria-hidden="true" />
            {`${people.length} Out${viewDate === today ? " Today" : ""}:`}
          </span>
          {typeGroups.map((group) => (
            <span key={group.id} className={styles.typeChip} data-code={group.code}>
              <span className={styles.typeChipDot} aria-hidden="true" />
              {`${group.count} ${group.name}`}
            </span>
          ))}
        </div>
      ) : null}

      {people.length > 0 && (typeGroups.length > 0 || people.length > 3) ? (
        <div className={styles.filterRow}>
          {typeGroups.length > 0 ? (
            <div className={styles.filterPills} role="group" aria-label="Filter by leave type">
              <button
                type="button"
                className={typeFilter === null ? styles.filterActive : styles.filter}
                aria-pressed={typeFilter === null}
                onClick={() => setTypeFilter(null)}
              >
                All ({people.length})
              </button>
              {typeGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={typeFilter === group.id ? styles.filterActive : styles.filter}
                  aria-pressed={typeFilter === group.id}
                  onClick={() => setTypeFilter(group.id)}
                >
                  {`${typeShort(group.name)} (${group.count})`}
                </button>
              ))}
            </div>
          ) : null}
          {people.length > 3 ? (
            <input
              type="search"
              className={styles.search}
              placeholder="Search person…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search people away this day"
            />
          ) : null}
        </div>
      ) : null}

      {matches.length === 0 ? (
        <p className={dialogStyles.dialogHint}>
          {people.length > 0 && filteredAway
            ? "No one matches the filters."
            : "No one is recorded away this day."}
        </p>
      ) : (
        <ul className={styles.people}>
          {matches.map((person) => (
            <PersonCard key={person.id} person={person} today={today} viewDate={viewDate} />
          ))}
        </ul>
      )}

      <footer className={styles.foot}>
        {people.length > 0 ? (
          <span className={styles.footNote}>
            <ShieldCheck size={14} aria-hidden="true" />
            {`${approvedCount} of ${people.length} requests approved.`}
          </span>
        ) : null}
        <button type="button" className={dialogStyles.saveButton} onClick={close}>
          Done
        </button>
      </footer>
    </div>
  );
}
