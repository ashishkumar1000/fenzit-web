import { useId, useMemo, useState } from "react";
import type { LeaveRow } from "../companyApi";
import { Avatar } from "./Avatar";
import { dayNumberOf, nextWorkingDay, shortRange } from "../leaveDateMath";
import { fmtDay } from "../format";
import dialogStyles from "./JobSettingsDialog.module.css";
import styles from "./LeaveDayModal.module.css";

/** One person card in the day modal: who, the request's span, today's
 *  position in the live leave — "Day N of M" counts today within the span's
 *  working days, and hides on a non-working today (a weekend inside the
 *  span) rather than reading "Day 0". Then the next working day after it
 *  ends, and the reason. Type chips are dropped on purpose — list rows
 *  carry no leave type (27-3's risk note). */
function PersonCard({ person, today }: { person: LeaveRow; today: string }) {
  const name = person.employeeName ?? person.employeeCode ?? "Unknown";
  const dayNumber = dayNumberOf(person, today);
  const inside = person.startDate <= today && today <= person.endDate;
  return (
    <li className={styles.personCard}>
      <Avatar name={person.employeeName ?? null} imageUrl={person.employeeAvatarUrl} />
      <div className={styles.personBody}>
        <p className={styles.personName}>
          {name}
          {person.employeeCode ? (
            <span className={styles.personCode}> · {person.employeeCode}</span>
          ) : null}
        </p>
        <p className={styles.personLine}>
          {shortRange(person.startDate, person.endDate)}
          {inside && dayNumber > 0 ? ` · Day ${dayNumber} of ${person.workingDays}` : ""}
        </p>
        <p className={styles.personLine}>Back on {fmtDay(nextWorkingDay(person.endDate))}</p>
        {person.reason === "" ? null : (
          <p className={styles.personReason}>
            <span>Reason</span>
            {person.reason}
          </p>
        )}
      </div>
    </li>
  );
}

/** The day drill-down (design's day-detail-modal.jpg): everyone approved
 *  away that day, with a client-side search over the cards. A plain native
 *  dialog — backdrop click closes; the list re-renders per open. */
export function LeaveDayModal({
  date,
  people,
  today,
  close,
}: {
  date: string;
  people: LeaveRow[];
  today: string;
  close: () => void;
}) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      needle === ""
        ? people
        : people.filter((person) =>
            `${person.employeeName ?? ""} ${person.employeeCode ?? ""}`
              .toLowerCase()
              .includes(needle),
          ),
    [people, needle],
  );
  return (
    <div className={dialogStyles.dialogForm}>
      <h3 id={titleId} className={dialogStyles.dialogTitle}>
        {fmtDay(date)}
      </h3>
      <p className={dialogStyles.dialogHint}>
        {people.length === 1
          ? "1 person is away, approved."
          : `${people.length} people are away, approved.`}
      </p>
      {people.length > 3 ? (
        <input
          type="search"
          className={styles.search}
          placeholder="Search people…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search people away this day"
        />
      ) : null}
      {matches.length === 0 ? (
        <p className={dialogStyles.dialogHint}>
          {needle === "" ? "Nobody is recorded away this day." : `Nobody matches “${query}”.`}
        </p>
      ) : (
        <ul className={styles.people}>
          {matches.map((person) => (
            <PersonCard key={person.id} person={person} today={today} />
          ))}
        </ul>
      )}
      <div className={dialogStyles.dialogActions}>
        <button type="button" className={dialogStyles.quietButton} onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
}
