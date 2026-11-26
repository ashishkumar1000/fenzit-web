import {
  Link,
  useLoaderData,
  useLocation,
  useNavigation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { holidaysOfficeLine } from "../features/admin/holidaysMath";
import { useState } from "react";
import type { adminHolidaysLoader } from "../features/admin/holidayLoaders";
import { Tabs } from "../features/admin/components/Tabs";
import { SkeletonBlock, SkeletonList, SkeletonSlot } from "../components/ui/Skeleton";
import { HOLIDAY_TABS } from "../features/admin/holidayTabs";
import type { HolidayOverview } from "../features/admin/companyApi";
import type { HolidayModalSeed } from "../features/admin/components/HolidayModal";
import { HolidayModal } from "../features/admin/components/HolidayModal";
import { LongWeekendExplainer } from "../features/admin/components/LongWeekendExplainer";
import {
  countdownLabel,
  employeesOff,
  hasWeeklyOff,
  isWeeklyOffDate,
  longWeekends,
  monthShort,
  weekdayNameOf,
} from "../features/admin/holidaysMath";
import {
  daysUntil,
  isMonth,
  monthCells,
  monthLabel,
  shiftMonth,
} from "../features/admin/leaveDateMath";
import { istToday } from "../features/admin/format";
import styles from "./AdminHolidaysPage.module.css";

/**
 * The holidays page, redesigned from the Stitch "Holiday Calendar UX
 * Redesign" screens (2026-11-26): a year switcher over a month calendar
 * (click a date to add or edit its holiday), the upcoming-holiday banner,
 * the upcoming list with real headcounts, the year's totals, the past
 * holidays and the client-side long-weekend finder. The full table lives on
 * the schedule page ("See Full List").
 */

const MONTH_GRID_WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function AdminHolidaysPage() {
  const data = useLoaderData<typeof adminHolidaysLoader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [modal, setModal] = useState<HolidayModalSeed | null>(null);
  const [explainer, setExplainer] = useState(false);
  const location = useLocation();
  const navigation = useNavigation();
  // The calendar region's load: a year or month change is a same-page
  // address refetch — while it persists past the delay, the calendar grid
  // and its side stack stand in with the grid's own layout. The header, the
  // tab strip and the year switcher hold; a different page's navigation is
  // the shell's skeleton.
  const regionPending =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname &&
    navigation.location?.search !== location.search;

  if (data.state === "failed") {
    return (
      <section className={styles.card}>
        <p className={styles.failed} role="alert">
          The holiday calendar could not load. Open this page again from the sidebar to retry.
        </p>
      </section>
    );
  }

  const year = data.year;
  const selfName = data.selfName;
  const monthParam = searchParams.get("month");
  const month =
    monthParam && isMonth(monthParam) ? monthParam : `${year}-${istToday().slice(5, 7)}`;
  const today = istToday();
  // BE ships the year's holidays date-ascending; sort defensively anyway so
  // the banner, lists and finder never depend on the wire order.
  const holidays = [...data.overview.holidays].sort((a, b) => a.date.localeCompare(b.date));

  const holidayByDate = new Map(holidays.map((h) => [h.date, h]));
  const upcoming = holidays.filter((h) => h.date >= today);
  const past = holidays.filter((h) => h.date < today).reverse();
  const weekends = longWeekends(holidays, data.overview.weeklyOffDefaults, year);
  const showWeekends = hasWeeklyOff(data.overview.weeklyOffDefaults, year);
  const banner = upcoming[0] ?? null;

  const setMonth = (next: string) => {
    // shiftMonth rolls across the year edge (Dec → Jan) — the year must
    // follow the SHIFTED month, not the page's current one, or January's
    // "December" grid renders over January's year data with no holidays.
    navigate(`?year=${next.slice(0, 4)}&month=${next}`, { preventScrollReset: true });
  };

  const openDate = (date: string) => {
    const holiday = holidayByDate.get(date);
    setModal(holiday ? { date, holiday } : { date });
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link to="/admin" className={styles.crumbLink}>
            Workspace
          </Link>
          <span className={styles.crumbSep} aria-hidden="true">
            ›
          </span>
          <Link to="/admin/company" className={styles.crumbLink}>
            Settings
          </Link>
          <span className={styles.crumbSep} aria-hidden="true">
            ›
          </span>
          <span className={styles.crumbHere} aria-current="page">
            Holidays &amp; Time-off
          </span>
        </nav>
        <div className={styles.headRow}>
          <div>
            <h1 className={styles.headTitle}>
              {selfName === null ? "Hello" : `Hello, ${selfName}`}
            </h1>
            <p className={styles.headSub}>{holidaysOfficeLine(data.overview.offices)}</p>
          </div>
          <div className={styles.headActions}>
            <button
              type="button"
              className={styles.addTop}
              onClick={() =>
                setModal({ date: year === today.slice(0, 4) ? today : `${year}-01-01` })
              }
            >
              + Add Holiday
            </button>
          </div>
        </div>
      </header>

      <Tabs basePath="/admin/company/holidays" tabs={[...HOLIDAY_TABS]} current="calendar" />

      <nav className={styles.yearRow} aria-label="Calendar year">
        {[Number(year) - 1, Number(year), Number(year) + 1].map((candidate) => (
          <Link
            key={candidate}
            to={`?year=${candidate}`}
            className={styles.yearChip}
            data-active={String(candidate) === year}
            preventScrollReset
          >
            {candidate}
            {candidate === Number(today.slice(0, 4)) ? (
              <span className={styles.currentMark}>Current</span>
            ) : null}
          </Link>
        ))}
      </nav>

      <SkeletonSlot
        show={regionPending}
        className={styles.grid}
        skeleton={<HolidaysGridSkeleton />}
      >
        <div className={styles.grid}>
          <div className={styles.stack}>
            <section className={styles.card}>
              <header className={styles.calHead}>
                <h2 className={styles.calTitle}>{monthLabel(month)}</h2>
                <div className={styles.calNav}>
                  <button
                    type="button"
                    className={styles.navButton}
                    onClick={() => setMonth(shiftMonth(month, -1))}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className={styles.navButton}
                    onClick={() => setMonth(today.slice(0, 7))}
                    disabled={month === today.slice(0, 7)}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={styles.navButton}
                    onClick={() => setMonth(shiftMonth(month, 1))}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>
              </header>
              <div className={styles.calGrid} role="group" aria-label={monthLabel(month)}>
                {MONTH_GRID_WEEKDAYS.map((day) => (
                  <span key={day} className={styles.weekday}>
                    {day}
                  </span>
                ))}
                {monthCells(month).map((cell, index) =>
                  cell === null ? (
                    <span key={`blank-${index}`} />
                  ) : (
                    <button
                      key={cell.date}
                      type="button"
                      className={styles.cell}
                      data-today={cell.date === today}
                      data-off={isWeeklyOffDate(data.overview.weeklyOffDefaults, cell.date)}
                      data-holiday={holidayByDate.has(cell.date)}
                      onClick={() => openDate(cell.date)}
                    >
                      <span className={styles.cellDay}>{cell.day}</span>
                      {holidayByDate.has(cell.date) ? (
                        <span
                          className={styles.cellHoliday}
                          title={holidayByDate.get(cell.date)!.name}
                        >
                          ● {holidayByDate.get(cell.date)!.name}
                        </span>
                      ) : null}
                    </button>
                  ),
                )}
              </div>
              <footer className={styles.calFoot}>
                <span className={styles.legend}>
                  <span className={styles.legendDot}>●</span> Holiday (offices it covers are closed)
                </span>
                <span className={styles.muted}>All times in Indian Standard Time (IST)</span>
              </footer>
            </section>

            <section className={styles.totalCard}>
              <span className={styles.totalIcon} aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
              </span>
              <div>
                <p className={styles.totalEyebrow}>
                  TOTAL PAID HOLIDAYS <span className={styles.yearTag}>{year}</span>
                </p>
                <p className={styles.totalSub}>
                  {data.overview.holidays.length} official holiday
                  {data.overview.holidays.length === 1 ? "" : "s"} · {officeSummary(data.overview)}
                </p>
              </div>
              <span className={styles.totalDays}>
                {data.overview.holidays.length} Day{data.overview.holidays.length === 1 ? "" : "s"}{" "}
                Off
              </span>
            </section>

            {showWeekends ? (
              <section className={styles.card}>
                <header className={styles.weekendHead}>
                  <span className={styles.weekendIcon} aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    >
                      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
                    </svg>
                  </span>
                  <div>
                    <p className={styles.totalEyebrow}>LONG WEEKEND BREAKS</p>
                    <p className={styles.totalSub}>Extended time off</p>
                  </div>
                  <span className={styles.weekendTag}>3+ Day Breaks</span>
                  <button
                    type="button"
                    className={styles.howChip}
                    onClick={() => setExplainer(true)}
                    aria-label="How long weekends are calculated"
                  >
                    ⓘ How?
                  </button>
                </header>
                <h3 className={styles.weekendTitle}>
                  {weekends.length} Long Weekend{weekends.length === 1 ? "" : "s"} in {year}
                </h3>
                <p className={styles.muted}>
                  A long weekend is a stretch of 3 or more consecutive days off — a holiday joining
                  your weekly off days (and any neighbouring holidays) into one uninterrupted break.
                </p>
                {weekends.length === 0 ? (
                  <p className={styles.empty}>No long weekends this year.</p>
                ) : (
                  <ul className={styles.weekendList}>
                    {weekends.map((weekend) => (
                      <li key={weekend.start} className={styles.weekendRow}>
                        <span className={styles.weekendName}>
                          <span className={styles.legendDot}>●</span>{" "}
                          {weekend.holidays.map((h) => h.name).join(" + ")}
                          <small className={styles.muted}>
                            {" "}
                            · {weekdayNameOf(weekend.start).slice(0, 3)},{" "}
                            {monthShort(weekend.start)} {weekend.start.slice(8, 10)} –{" "}
                            {monthShort(weekend.end)} {weekend.end.slice(8, 10)}
                          </small>
                        </span>
                        <span className={styles.weekendChip}>{weekend.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className={styles.tip}>
                  ★ Tip: great time for team vacation planning without affecting leave balance.
                </p>
              </section>
            ) : null}
          </div>

          <div className={styles.stack}>
            {banner !== null ? (
              <section className={styles.banner}>
                <div>
                  <p className={styles.bannerEyebrow}>🕘 UPCOMING HOLIDAY</p>
                  <p className={styles.bannerName}>{banner.name}</p>
                  <p className={styles.bannerSub}>
                    {weekdayNameOf(banner.date)}, {banner.date.slice(8, 10)}{" "}
                    {monthShort(banner.date)} {banner.date.slice(0, 4)}
                  </p>
                </div>
                <div className={styles.bannerCount}>
                  <span className={styles.bannerIn}>IN</span>
                  <span className={styles.bannerDays}>
                    {countdownLabel(banner.date, today) === "Today"
                      ? "0"
                      : String(Math.max(0, daysUntil(today, banner.date)))}
                  </span>
                  <span className={styles.bannerIn}>DAYS</span>
                </div>
              </section>
            ) : null}

            <section className={styles.card}>
              <header className={styles.listHead}>
                <h3 className={styles.sectionTitle}>
                  Upcoming in {year}
                  <span className={styles.countTag}>
                    {upcoming.length} Holiday{upcoming.length === 1 ? "" : "s"}
                  </span>
                </h3>
                <Link
                  className={styles.seeAll}
                  to={`/admin/company/holidays/schedule?year=${year}`}
                >
                  See Full List →
                </Link>
              </header>
              {upcoming.length === 0 ? (
                <p className={styles.empty}>No upcoming holidays.</p>
              ) : (
                <ul className={styles.rows}>
                  {upcoming.slice(0, 4).map((holiday) => (
                    <li key={holiday.id} className={styles.row}>
                      <span className={styles.dayBlock}>
                        <span className={styles.dayMon}>{monthShort(holiday.date)}</span>
                        <span className={styles.dayNum}>{holiday.date.slice(8, 10)}</span>
                      </span>
                      <span className={styles.rowBody}>
                        <strong className={styles.rowName}>{holiday.name}</strong>
                        <small className={styles.muted}>
                          {weekdayNameOf(holiday.date)} ·{" "}
                          {employeesOff(
                            holiday,
                            data.overview.offices,
                            data.overview.unassignedCount,
                          )}{" "}
                          get the day off
                        </small>
                        <small className={styles.officeTag}>
                          {holiday.scope === "offices"
                            ? officeNames(holiday.officeIds ?? [], data.overview)
                            : "All Offices"}
                        </small>
                      </span>
                      <span className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.linkish}
                          onClick={() => setModal({ date: holiday.date, holiday })}
                        >
                          Edit
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.card}>
              <header className={styles.listHead}>
                <h3 className={styles.sectionTitle}>Past Holidays This Year</h3>
                <span className={styles.countTag}>{past.length} Passed</span>
              </header>
              {past.length === 0 ? (
                <p className={styles.empty}>No past holidays this year.</p>
              ) : (
                <ul className={styles.pastList}>
                  {past.map((holiday) => (
                    <li key={holiday.id} className={styles.pastRow}>
                      <span className={styles.pastTick}>✓</span>
                      {holiday.date.slice(8, 10)} {monthShort(holiday.date)}{" "}
                      {holiday.date.slice(0, 4)} · {holiday.name}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </SkeletonSlot>

      {modal !== null ? (
        <HolidayModal seed={modal} overview={data.overview} onClose={() => setModal(null)} />
      ) : null}

      {explainer ? <LongWeekendExplainer onClose={() => setExplainer(false)} /> : null}
    </div>
  );
}

/** The calendar region mid-load (CAP-3): the grid's own two-column layout
 *  with the month card, the year total band, the upcoming banner and the
 *  two list cards standing in as blocks — the region keeps its dimensions
 *  while the year's or month's data loads. Decorative; the tab strip and
 *  the year switcher above hold the page. */
function HolidaysGridSkeleton() {
  return (
    <>
      <div className={styles.stack}>
        <div className={styles.card}>
          <SkeletonBlock width="30%" height={12} />
          <div className={styles.calSkeleton}>
            {Array.from({ length: 35 }, (_, index) => (
              <SkeletonBlock key={index} height={52} />
            ))}
          </div>
        </div>
        <div className={styles.totalCard}>
          <SkeletonBlock width="56%" height={10} />
        </div>
      </div>
      <div className={styles.stack}>
        <div className={styles.card}>
          <SkeletonBlock width="40%" height={12} />
          <SkeletonList rows={4} cells={[1]} />
        </div>
        <div className={styles.card}>
          <SkeletonBlock width="34%" height={12} />
          <SkeletonList rows={3} cells={[1]} />
        </div>
      </div>
    </>
  );
}

function officeNames(officeIds: string[], overview: HolidayOverview): string {
  const names = new Map(overview.offices.map((o) => [o.officeId, o.name]));
  return (
    officeIds
      .map((id) => names.get(id))
      .filter((name): name is string => name !== undefined)
      .join(", ") || "Offices no longer listed"
  );
}

function officeSummary(overview: HolidayOverview): string {
  if (overview.offices.length === 0) return "no offices set up";
  const scoped = overview.holidays.some((h) => h.scope === "offices");
  return scoped
    ? `across ${overview.offices.length} office${
        overview.offices.length === 1 ? "" : "s"
      } — some holidays are office-specific`
    : `all ${overview.offices.length} office${overview.offices.length === 1 ? "" : "s"}`;
}
