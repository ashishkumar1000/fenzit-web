import { useRef, useState } from "react";
import { Link } from "react-router";
import type { HolidayRow, LeaveRow, Page } from "../companyApi";
import {
  groupApprovedByDate,
  localIsoToday,
  monthLabel,
  shiftMonth,
  shortRange,
} from "../leaveDateMath";
import { leaveCalendarUrl } from "../leaveUrl";
import { LeaveCalendarGrid } from "./LeaveCalendarGrid";
import { LeaveDayModal } from "./LeaveDayModal";
import { SectionCard } from "./SectionCard";
import { Avatar } from "./Avatar";
import dialogStyles from "./JobSettingsDialog.module.css";
import styles from "./LeaveCalendarTab.module.css";

const UPCOMING_SHOWN = 10;
const HOLIDAYS_SHOWN = 4;

/** The rail's one upcoming entry: "17–20 Nov" under the person's name. */
function UpcomingRow({ row }: { row: LeaveRow }) {
  const name = row.employeeName ?? row.employeeCode ?? "Unknown";
  return (
    <li className={styles.upcomingRow}>
      <Avatar name={row.employeeName ?? null} imageUrl={row.employeeAvatarUrl} />
      <div className={styles.upcomingBody}>
        <span className={styles.upcomingName}>{name}</span>
        <span className={styles.upcomingDates}>{shortRange(row.startDate, row.endDate)}</span>
      </div>
    </li>
  );
}

/** The calendar tab: month nav + grid + day modal on the left, the upcoming
 *  time-off rail and upcoming holidays rail on the right. The month is URL
 *  state — every nav is an address, the loader re-reads the window. */
export function LeaveCalendarTab({
  month,
  page,
  upcoming,
  holidays,
}: {
  month: string;
  page: Page<LeaveRow>;
  upcoming: LeaveRow[];
  holidays: HolidayRow[];
}) {
  const today = localIsoToday();
  const byDate = groupApprovedByDate(page.data);
  const holidayNames = new Map(holidays.map((holiday) => [holiday.date, holiday.name]));
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [openCount, setOpenCount] = useState(0);

  const upcomingSorted = [...upcoming].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const upcomingShown = upcomingSorted.slice(0, UPCOMING_SHOWN);
  const holidaysNext = holidays
    .filter((holiday) => holiday.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, HOLIDAYS_SHOWN);

  const openDayModal = (date: string) => {
    setOpenDay(date);
    setOpenCount((count) => count + 1);
    dialogRef.current?.showModal();
  };

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.nav}>
          <Link className={styles.navStep} to={leaveCalendarUrl(shiftMonth(month, -1))}>
            ‹ {monthLabel(shiftMonth(month, -1)).split(" ")[0]}
          </Link>
          <h3 className={styles.monthLabel}>{monthLabel(month)}</h3>
          <Link className={styles.navStep} to={leaveCalendarUrl(shiftMonth(month, 1))}>
            {monthLabel(shiftMonth(month, 1)).split(" ")[0]} ›
          </Link>
          <Link className={styles.today} to={leaveCalendarUrl("")}>
            Today
          </Link>
        </div>
        <SectionCard
          title="Who is away"
          meta="Approved leave only — pending requests live on the Requests tab."
        >
          {page.data.length === 0 ? (
            <p className={styles.empty}>No approved leave overlaps this month.</p>
          ) : (
            <LeaveCalendarGrid
              month={month}
              byDate={byDate}
              holidayNames={holidayNames}
              today={today}
              openDay={openDayModal}
            />
          )}
          {page.hasMore ? (
            <p className={styles.hasMore} role="status">
              More requests exist than fit here — use Requests for the full list.
            </p>
          ) : null}
        </SectionCard>
      </div>
      <aside className={styles.rail}>
        <SectionCard title="Upcoming time off">
          {upcomingShown.length === 0 ? (
            <p className={styles.empty}>Nothing scheduled.</p>
          ) : (
            <ul className={styles.upcoming}>
              {upcomingShown.map((row) => (
                <UpcomingRow key={row.id} row={row} />
              ))}
            </ul>
          )}
          {upcomingSorted.length > upcomingShown.length ? (
            <p className={styles.hasMore} role="status">
              More requests exist — use Requests for the full list.
            </p>
          ) : null}
        </SectionCard>
        <SectionCard title="Upcoming holidays">
          {holidaysNext.length === 0 ? (
            <p className={styles.empty}>No holidays ahead this year.</p>
          ) : (
            <ul className={styles.holidays}>
              {holidaysNext.map((holiday) => (
                <li key={holiday.id} className={styles.holidayRow}>
                  <span className={styles.holidayDate}>
                    {shortRange(holiday.date, holiday.date)}
                  </span>
                  <span className={styles.holidayName}>{holiday.name}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </aside>
      <dialog
        ref={dialogRef}
        className={`${dialogStyles.dialog} ${styles.dayDialog}`}
        aria-label="Who is away this day"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {openDay !== null ? (
          <LeaveDayModal
            key={openCount}
            date={openDay}
            people={byDate.get(openDay) ?? []}
            today={today}
            close={() => dialogRef.current?.close()}
          />
        ) : null}
      </dialog>
    </div>
  );
}
