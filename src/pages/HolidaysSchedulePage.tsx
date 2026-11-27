import {
  Link,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "react-router";
import { useState } from "react";
import type { adminHolidayScheduleLoader } from "../features/admin/holidayLoaders";
import {
  RegionTableSkeleton,
  RegionTilesSkeleton,
} from "../features/admin/components/RegionSkeleton";
import { Tabs } from "../features/admin/components/Tabs";
import { SkeletonSlot } from "../components/ui/Skeleton";
import { HOLIDAY_TABS } from "../features/admin/holidayTabs";
import type { HolidayModalSeed } from "../features/admin/components/HolidayModal";
import { HolidayModal } from "../features/admin/components/HolidayModal";
import { HolidayInspectorSidebar } from "../features/admin/components/HolidayInspectorSidebar";
import {
  downloadIcs,
  hasWeeklyOff,
  holidaysOfficeLine,
  longWeekends,
  monthShort,
  officeLabel,
  weekdayNameOf,
} from "../features/admin/holidaysMath";
import { istToday } from "../features/admin/format";
import styles from "./HolidaysSchedulePage.module.css";

/**
 * The full holiday schedule (2026-11-26 redesign, Stitch screen 3): the
 * year's official holidays as one month-grouped table with real headcounts,
 * office filters and month pills, Print + Export Calendar (.ics), and the
 * inspector sidebar that opens when a row is clicked (?inspect=<date>).
 */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_KEYS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

export function HolidaysSchedulePage() {
  const data = useLoaderData<typeof adminHolidayScheduleLoader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [modal, setModal] = useState<HolidayModalSeed | null>(null);
  const location = useLocation();
  const navigation = useNavigation();
  // The schedule region's load: the holidays routes refetch on any address
  // change, so a pill click (office, month) or an inspect open moves the
  // region below the tab strip — stats, table and coverage stand in while
  // the load persists past the delay. A different page's navigation is the
  // shell's skeleton; a same-address revalidation keeps the region.
  const regionPending =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname &&
    navigation.location?.search !== location.search;

  if (data.state === "failed") {
    return (
      <section className={styles.card}>
        <p className={styles.empty} role="alert">
          The holiday schedule could not load. Open this page again from the sidebar to retry.
        </p>
      </section>
    );
  }

  const { year, overview, inspect, selfName } = data;
  const today = istToday();
  // An unknown office id (a stale bookmark after the office was deleted)
  // would filter the table with NO pill active — fall back to every office.
  const rawOffice = searchParams.get("office");
  const office =
    rawOffice !== null &&
    (rawOffice === "all" || overview.offices.some((o) => o.officeId === rawOffice))
      ? rawOffice
      : "all";
  const month = searchParams.get("month") ?? "all";

  const officeNames = new Map(overview.offices.map((o) => [o.officeId, o.name]));
  // BE ships the year's holidays date-ascending; sort defensively anyway so
  // the month groups and the ics export never depend on the wire order.
  const holidays = [...overview.holidays].sort((a, b) => a.date.localeCompare(b.date));
  const weekends = longWeekends(holidays, overview.weeklyOffDefaults, year);
  const showWeekends = hasWeeklyOff(overview.weeklyOffDefaults, year);
  const totalStaff =
    overview.offices.reduce((sum, o) => sum + o.staffCount, 0) + overview.unassignedCount;

  const appliesTo = (holiday: { scope?: string; officeIds?: string[] }, officeId: string) =>
    (holiday.scope ?? "all") === "all" || (holiday.officeIds ?? []).includes(officeId);

  const filtered = holidays.filter(
    (holiday) =>
      (office === "all" || appliesTo(holiday, office)) &&
      (month === "all" || holiday.date.slice(5, 7) === month),
  );

  // Month-grouped rows: [{ month: "01", name: "January", rows: [...] }]
  const groups = MONTH_KEYS.map((key, index) => ({
    month: key,
    name: MONTH_NAMES[index],
    rows: filtered.filter((holiday) => holiday.date.slice(5, 7) === key),
  })).filter((group) => group.rows.length > 0);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    navigate(`?${next.toString()}`, { preventScrollReset: true });
  };

  const openInspect = (date: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("inspect", date);
    navigate(`?${next.toString()}`, { preventScrollReset: true });
  };

  const closeInspect = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("inspect");
    navigate(`?${next.toString()}`, { preventScrollReset: true });
  };

  // The page clock is IST — seed "today" off it, not the browser-local year.
  const createSeedDate = year === today.slice(0, 4) ? today : `${year}-01-01`;

  const officeLine = holidaysOfficeLine(overview.offices);

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
            <h1 className={styles.title}>{selfName === null ? "Hello" : `Hello, ${selfName}`}</h1>
            <p className={styles.subtitle}>{officeLine}</p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.ghostButton} onClick={() => window.print()}>
              🖨 Print
            </button>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => downloadIcs(holidays, year)}
            >
              ⬇ Export Calendar
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setModal({ date: createSeedDate })}
            >
              + Add Holiday
            </button>
          </div>
        </div>
      </header>

      <Tabs basePath="/admin/company/holidays" tabs={[...HOLIDAY_TABS]} current="list" />

      <SkeletonSlot
        show={regionPending}
        className={styles.regionStack}
        skeleton={<ScheduleSkeleton />}
      >
        <div className={styles.statRow}>
          <section className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true">
              <TotalHolidaysIcon />
            </span>
            <div>
              <p className={styles.statEyebrow}>TOTAL HOLIDAYS</p>
              <p className={styles.statValue}>{overview.holidays.length}</p>
              <p className={styles.statSub}>
                {overview.holidays.length} Day{overview.holidays.length === 1 ? "" : "s"} Off
              </p>
            </div>
          </section>
          <section className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true">
              <IndianOfficesIcon />
            </span>
            <div>
              <p className={styles.statEyebrow}>INDIAN OFFICES</p>
              <p className={styles.statValue}>{overview.offices.length}</p>
              <p className={styles.statSub}>
                {totalStaff} Employee{totalStaff === 1 ? "" : "s"} tracked
              </p>
            </div>
          </section>
          {showWeekends ? (
            <section className={styles.statCard}>
              <span className={styles.statIcon} aria-hidden="true">
                <LongWeekendIcon />
              </span>
              <div>
                <p className={styles.statEyebrow}>LONG WEEKEND BREAKS</p>
                <p className={styles.statValue}>{weekends.length}</p>
                <p className={styles.statSub}>3+ day breaks</p>
              </div>
            </section>
          ) : null}
        </div>

        <section className={styles.card}>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Office</span>
              <div className={styles.pillRow}>
                <button
                  type="button"
                  className={styles.pill}
                  data-on={office === "all"}
                  onClick={() => setParam("office", "all")}
                >
                  All Offices
                </button>
                {overview.offices.map((o) => (
                  <button
                    key={o.officeId}
                    type="button"
                    className={styles.pill}
                    data-on={office === o.officeId}
                    onClick={() => setParam("office", o.officeId)}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Month</span>
              <div className={styles.pillRow}>
                <button
                  type="button"
                  className={styles.pill}
                  data-on={month === "all"}
                  onClick={() => setParam("month", "all")}
                >
                  All
                </button>
                {MONTH_KEYS.map((key, index) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.pill}
                    data-on={month === key}
                    onClick={() => setParam("month", key)}
                  >
                    {MONTH_NAMES[index].slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {groups.length === 0 ? (
            <p className={styles.empty}>
              No holidays match these filters. Clear the office or month filter, or add a holiday.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Holiday</th>
                  <th scope="col">Day</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Offices</th>
                  <th scope="col">
                    <span className={styles.visuallyHidden}>Edit</span>
                  </th>
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group.month}>
                  <tr className={styles.monthRow}>
                    <td colSpan={6}>
                      {group.name.toUpperCase()} {year}
                    </td>
                  </tr>
                  {group.rows.map((holiday) => (
                    <tr
                      key={holiday.id}
                      className={styles.row}
                      tabIndex={0}
                      onClick={() => openInspect(holiday.date)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openInspect(holiday.date);
                        }
                      }}
                      aria-label={`Inspect ${holiday.name} on ${holiday.date}`}
                    >
                      <td>
                        <span className={styles.dateBlock}>
                          <span className={styles.dateDay}>{holiday.date.slice(8, 10)}</span>
                          <span className={styles.dateMonth}>{monthShort(holiday.date)}</span>
                        </span>
                      </td>
                      <td>
                        <strong className={styles.nameStrong}>{holiday.name}</strong>
                        {holiday.description ? (
                          <small className={styles.desc}>{holiday.description}</small>
                        ) : null}
                      </td>
                      <td className={styles.weekdayText}>{weekdayNameOf(holiday.date)}</td>
                      <td>Full Day</td>
                      <td>
                        <span className={styles.chip}>{officeLabel(holiday, officeNames)}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.editBtn}
                          aria-label={`Edit ${holiday.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setModal({ date: holiday.date, holiday });
                          }}
                        >
                          ✎
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          )}
        </section>

        <section className={styles.card}>
          <h3 className={styles.coverageTitle}>Branch Office Coverage</h3>
          <p className={styles.coverageSub}>
            How many employees work at each office and which holidays apply to them.
          </p>
          <ul className={styles.coverageList}>
            {overview.offices.map((o) => (
              <li key={o.officeId} className={styles.coverageRow}>
                <span className={styles.coverageName}>{o.name}</span>
                <span
                  className={styles.coverageBar}
                  role="img"
                  aria-label={`${o.staffCount} staff`}
                >
                  <span
                    className={styles.coverageFill}
                    style={{
                      width: `${totalStaff > 0 ? Math.round((o.staffCount / totalStaff) * 100) : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.coverageCount}>{o.staffCount} staff</span>
              </li>
            ))}
            {overview.unassignedCount > 0 ? (
              <li className={styles.coverageRow}>
                <span className={styles.coverageName}>Work from Home staff</span>
                <span
                  className={styles.coverageBar}
                  role="img"
                  aria-label={`${overview.unassignedCount} staff`}
                >
                  <span
                    className={styles.coverageFill}
                    style={{
                      width: `${totalStaff > 0 ? Math.round((overview.unassignedCount / totalStaff) * 100) : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.coverageCount}>{overview.unassignedCount} staff</span>
              </li>
            ) : null}
          </ul>
        </section>
      </SkeletonSlot>

      {inspect !== null ? (
        // Keyed per date: the inline delete-confirmation must never leak
        // from one inspected day into the next.
        <HolidayInspectorSidebar
          key={inspect.date}
          inspect={inspect}
          overview={overview}
          onClose={closeInspect}
          onEdit={(holiday) => setModal({ date: holiday.date, holiday })}
        />
      ) : null}

      {modal !== null ? (
        <HolidayModal seed={modal} overview={overview} onClose={() => setModal(null)} />
      ) : null}
    </div>
  );
}

/** The schedule region's stand-in: the three stat tiles, the month-grouped
 *  table card (the same six columns the real table lays out) and the
 *  coverage card — the exact footprint the loaded region fills. */
function ScheduleSkeleton() {
  return (
    <>
      <RegionTilesSkeleton tiles={3} />
      <RegionTableSkeleton rows={9} columns={[0.9, 2.2, 1, 1.2, 1.2, 0.5]} />
      <RegionTableSkeleton rows={3} columns={[1.8, 2.6, 0.9]} />
    </>
  );
}

/** The stat tiles' marks — each one invented and hand-drawn for this page by
 *  its own agent (2026-11-28, no emoji, no stock glyph): a pennant garland
 *  for sanctioned stillness, a family of gathering places for the offices,
 *  and a kite for the short blessed escape. Stroke-only line art on the 24
 *  grid; the chip (`.statIcon`) sizes and inks them via currentColor. */
function TotalHolidaysIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.35 6.2C2.55 7 2.72 7.5 2.9 7.9C5.4 11.55 8.7 12.1 12 11.7C15.2 11.35 18.6 9.7 21.1 6.95C21.3 6.5 21.32 6.05 21.05 5.65" />
      <path d="M5.6 10.58Q6.95 11.15 8.3 11.65L7.3 15Z" />
      <path d="M9.7 11.8Q11.8 11.85 13.85 11.35L12 16.3Z" />
      <path d="M15.1 10.95Q16.6 10.18 18.1 9.4L17.2 14.2Z" />
      <circle cx="11.9" cy="8.1" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IndianOfficesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* The uneven ground the three places share. */}
      <path d="M3.2 20 C6 19.8 8.9 20.05 12 19.9 C15.1 19.75 18.2 20 20.9 19.85" />
      {/* The gabled hut with its tiny arch window. */}
      <path d="M4.05 12.85 Q5.8 10.3 7.4 8.4 Q9.15 10.4 10.5 12.85" />
      <path d="M4.5 12.95 C4.42 15.2 4.38 17.4 4.42 19.85" />
      <path d="M10.15 13 C10.22 15.3 10.25 17.5 10.22 19.8" />
      <path d="M6.15 17.9 V16.5 Q6.15 15.5 7.1 15.5 Q8.05 15.5 8.05 16.5 V17.9" />
      {/* The open domed pavilion (chhatri) — tallest, centre. */}
      <path d="M10.95 12.05 C10.75 9.7 11.35 7.1 12.55 5.6 C13.8 7 14.45 9.6 14.3 12.1" />
      <path d="M10.55 12.2 Q12.6 11.95 14.65 12.3" />
      <path d="M12.55 5.55 C12.5 5 12.6 4.6 12.5 4.15" />
      <path d="M11.25 12.45 C11.2 15 11.18 17.4 11.22 19.85" />
      <path d="M13.95 12.5 C14 15.05 14.02 17.5 13.98 19.9" />
      {/* The plain flat-roofed block. */}
      <path d="M15.8 10.1 C17.2 9.95 18.6 10.2 20 10.05" />
      <path d="M15.9 10.15 C15.82 13.2 15.8 16.3 15.85 19.8" />
      <path d="M19.92 10.1 C20 13.2 20.02 16.4 19.95 19.85" />
    </svg>
  );
}

function LongWeekendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* The kite's sail — every edge bows a different way. */}
      <path d="M14.8 2.2 Q17.2 5.5 20.2 8.1 Q17.1 10.6 13.4 12.6 Q10.6 10.1 8.4 7 Q11.9 4.3 14.8 2.2 Z" />
      {/* Spine and cross-spar, poking past the sail tips. */}
      <path d="M14.8 2.2 Q14.5 7.3 13.4 12.6" />
      <path d="M8.1 6.9 Q14.3 7.95 20.45 8.2" />
      {/* The tail and its two ribbon bows. */}
      <path d="M13.4 12.6 C14.3 14.8 13.5 16.3 14.1 18.1 C14.5 19.3 15 20.2 15.7 20.9" />
      <path d="M12.8 16.5 Q13.95 16.2 15.1 15.6" />
      <path d="M13.5 19.2 Q14.4 18.8 15.4 18.3" />
      {/* The slack string tied at the wingtip. */}
      <path d="M8.4 7 C6.3 9.5 5 12.3 5.3 15.1 C5.5 17 6.3 18.5 7.6 19.7" />
    </svg>
  );
}
