import { useRef, useState } from "react";
import { Link } from "react-router";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { HolidayRow, LeaveRow, LeaveSummary, Page } from "../companyApi";
import {
  daysInMonth,
  groupApprovedByDate,
  localIsoToday,
  monthDay,
  monthLabel,
  shiftMonth,
  weekdayName,
  workingDaysInMonth,
} from "../leaveDateMath";
import { buildTypeGroups, typeShort } from "../leaveTypeUi";
import { leaveCalendarUrl } from "../leaveUrl";
import { LeaveCalendarGrid } from "./LeaveCalendarGrid";
import { LeaveTimeline, groupUpcoming } from "./LeaveTimeline";
import { LeaveBreakdownCard } from "./LeaveBreakdownCard";
import { LeaveDayModal } from "./LeaveDayModal";
import { SectionCard } from "./SectionCard";
import dialogStyles from "./JobSettingsDialog.module.css";
import styles from "./LeaveCalendarTab.module.css";

const HOLIDAYS_SHOWN = 4;
const HOLIDAYS_PATH = "/admin/company/holidays";

type CalendarView = "grid" | "timeline";

/** The month's pulse numbers, counted before any filter so the rail stays
 *  stable while the grid narrows — the members page's tiles rule. */
function pulseOf(rows: LeaveRow[], month: string): { people: number; days: number } {
  const people = new Set<string>();
  let days = 0;
  for (const row of rows) {
    const inMonth = daysInMonth(row.startDate, row.endDate, month);
    if (inMonth === 0) continue;
    people.add(row.employeeId);
    days += inMonth;
  }
  return { people: people.size, days };
}

/** The calendar tab — the design's "Upcoming Leaves" screen. One controls
 *  card (month nav pill, Timeline | Monthly Grid toggle, type filter pills,
 *  search) over the active view, with the Monthly Pulse, Upcoming Holidays
 *  and Leave Breakdown cards riding the rail. The month is URL state; the
 *  view and filters are component state, reset by the page's month remount. */
export function LeaveCalendarTab({
  month,
  page,
  upcoming,
  upcomingHasMore,
  holidays,
  summary,
}: {
  month: string;
  page: Page<LeaveRow>;
  upcoming: LeaveRow[];
  upcomingHasMore: boolean;
  holidays: HolidayRow[];
  summary: LeaveSummary | null;
}) {
  const today = localIsoToday();
  const [view, setView] = useState<CalendarView>("grid");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [openCount, setOpenCount] = useState(0);

  const typeGroups = buildTypeGroups(page.data);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (row: LeaveRow) =>
    (typeFilter === null || row.leaveTypeId === typeFilter) &&
    (normalizedQuery === "" ||
      `${row.employeeName ?? ""} ${row.employeeCode ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery));

  const filteredRows = page.data.filter(matches);
  const byDate = groupApprovedByDate(filteredRows);
  const holidayNames = new Map(holidays.map((holiday) => [holiday.date, holiday.name]));
  const groups = groupUpcoming(upcoming.filter(matches), today);

  const pulse = pulseOf(page.data, month);
  const capacity = summary === null ? 0 : summary.activeEmployees * workingDaysInMonth(month);
  const available = Math.max(capacity - pulse.days, 0);
  const availablePct = capacity > 0 ? Math.round((available / capacity) * 100) : 100;

  const holidaysNext = holidays
    .filter((holiday) => holiday.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, HOLIDAYS_SHOWN);
  const holidayYear = holidaysNext[0]?.date.slice(0, 4) ?? today.slice(0, 4);

  const clearFilters = (
    <button
      type="button"
      className={styles.clearFilters}
      onClick={() => {
        setTypeFilter(null);
        setQuery("");
      }}
    >
      Clear filters
    </button>
  );

  const openDayModal = (date: string) => {
    setOpenDay(date);
    setOpenCount((count) => count + 1);
    dialogRef.current?.showModal();
  };

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.controls}>
          <div className={styles.controlsTop}>
            <div className={styles.navPill}>
              <Link
                className={styles.navStep}
                to={leaveCalendarUrl(shiftMonth(month, -1))}
                aria-label={`Previous month, ${monthLabel(shiftMonth(month, -1))}`}
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </Link>
              <h3 className={styles.monthLabel}>{monthLabel(month)}</h3>
              <Link
                className={styles.navStep}
                to={leaveCalendarUrl(shiftMonth(month, 1))}
                aria-label={`Next month, ${monthLabel(shiftMonth(month, 1))}`}
              >
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
              <Link className={styles.thisMonth} to={leaveCalendarUrl("")}>
                <span className={styles.thisMonthDot} aria-hidden="true" />
                This Month
              </Link>
            </div>
            <div className={styles.toggle} role="group" aria-label="Calendar view">
              <button
                type="button"
                className={styles.toggleBtn}
                aria-pressed={view === "timeline"}
                onClick={() => setView("timeline")}
              >
                <CalendarRange size={14} aria-hidden="true" />
                Timeline
              </button>
              <button
                type="button"
                className={styles.toggleBtn}
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <CalendarDays size={14} aria-hidden="true" />
                Monthly Grid
              </button>
            </div>
          </div>
          <div className={styles.controlsBottom}>
            <div className={styles.filterPills} role="group" aria-label="Filter by leave type">
              <button
                type="button"
                className={typeFilter === null ? styles.filterActive : styles.filter}
                aria-pressed={typeFilter === null}
                onClick={() => setTypeFilter(null)}
              >
                All Leaves
              </button>
              {typeGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={typeFilter === group.id ? styles.filterActive : styles.filter}
                  data-code={group.code}
                  aria-pressed={typeFilter === group.id}
                  onClick={() => setTypeFilter(group.id)}
                >
                  <span className={styles.filterDot} aria-hidden="true" />
                  {typeShort(group.name)}
                </button>
              ))}
            </div>
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchGlyph} aria-hidden="true" />
              <input
                type="search"
                className={styles.search}
                placeholder="Search team member…"
                aria-label="Search team member"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>
        <SectionCard
          title="Who is away"
          meta="Approved leave only — pending requests live on the Requests tab."
        >
          {view === "grid" ? (
            page.data.length === 0 ? (
              <p className={styles.empty}>No approved leave overlaps this month.</p>
            ) : filteredRows.length === 0 ? (
              <p className={styles.empty}>
                <span>No approved leave matches the filters.</span> {clearFilters}
              </p>
            ) : (
              <LeaveCalendarGrid
                month={month}
                byDate={byDate}
                holidayNames={holidayNames}
                today={today}
                openDay={openDayModal}
              />
            )
          ) : upcoming.length === 0 ? (
            <p className={styles.empty}>Nothing scheduled in the upcoming window.</p>
          ) : groups.thisWeek.length + groups.nextWeek.length + groups.later.length === 0 ? (
            <p className={styles.empty}>
              <span>No upcoming leave matches the filters.</span> {clearFilters}
            </p>
          ) : (
            <LeaveTimeline groups={groups} today={today} />
          )}
          {view === "timeline" && upcomingHasMore ? (
            <p className={styles.hasMore} role="status">
              More approvals exist than fit the upcoming window — use Requests for the full list.
            </p>
          ) : null}
          {page.hasMore ? (
            <p className={styles.hasMore} role="status">
              More requests exist than fit here — use Requests for the full list.
            </p>
          ) : null}
        </SectionCard>
      </div>
      <aside className={styles.rail}>
        <SectionCard title="Monthly Pulse" meta={monthLabel(month)}>
          <div className={styles.pulseTiles}>
            <div className={styles.pulseTile}>
              <span className={styles.pulseNumber}>{pulse.people}</span>
              <span className={styles.pulseText}>Team on leave</span>
            </div>
            <div className={styles.pulseTile}>
              <span className={styles.pulseNumber}>{pulse.days}</span>
              <span className={styles.pulseText}>Total days out</span>
            </div>
          </div>
          {summary === null ? (
            <p className={styles.meterLine}>
              <span>The team size is unavailable right now — the availability meter needs it.</span>
            </p>
          ) : (
            <>
              <div
                className={styles.meter}
                role="img"
                aria-label={`${availablePct}% of the month's working capacity available`}
              >
                <div className={styles.meterFill} style={{ width: `${availablePct}%` }} />
              </div>
              <p className={styles.meterLine}>
                <span className={styles.meterPct}>{availablePct}% Available</span>
                <span>
                  {available} of {capacity} working days free · {summary.activeEmployees} active
                </span>
              </p>
            </>
          )}
        </SectionCard>
        <SectionCard
          title="Upcoming Holidays"
          meta={holidaysNext.length > 0 ? `${holidaysNext.length} Upcoming` : undefined}
          footer={
            <Link className={styles.holidaysLink} to={HOLIDAYS_PATH}>
              View {holidayYear} Holiday Calendar →
            </Link>
          }
        >
          {holidaysNext.length === 0 ? (
            <p className={styles.empty}>No holidays ahead this year.</p>
          ) : (
            <ul className={styles.holidays}>
              {holidaysNext.map((holiday) => (
                <li key={holiday.id} className={styles.holidayRow}>
                  <span className={styles.dateTile} aria-hidden="true">
                    <span className={styles.dateTileMonth}>
                      {monthDay(holiday.date).split(" ")[0]}
                    </span>
                    <span className={styles.dateTileDay}>{Number(holiday.date.slice(8, 10))}</span>
                  </span>
                  <span className={styles.holidayBody}>
                    <span className={styles.holidayName}>{holiday.name}</span>
                    <span className={styles.holidayMeta}>
                      {weekdayName(holiday.date)} · Single Day · All Offices
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <LeaveBreakdownCard month={month} rows={page.data} />
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
            byDate={byDate}
            today={today}
            close={() => dialogRef.current?.close()}
          />
        ) : null}
      </dialog>
    </div>
  );
}
