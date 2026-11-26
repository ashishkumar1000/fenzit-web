import { Link, useLoaderData, useNavigate, useSearchParams } from "react-router";
import { useState } from "react";
import type { adminHolidayScheduleLoader } from "../features/admin/holidayLoaders";
import { Tabs } from "../features/admin/components/Tabs";
import { HOLIDAY_TABS } from "../features/admin/holidayTabs";
import type { HolidayModalSeed } from "../features/admin/components/HolidayModal";
import { HolidayModal } from "../features/admin/components/HolidayModal";
import { HolidayInspectorSidebar } from "../features/admin/components/HolidayInspectorSidebar";
import {
  downloadIcs,
  employeesOff,
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

      <div className={styles.statRow}>
        <section className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            📅
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
            🏢
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
              ⚡
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
                <th scope="col">Impact</th>
                <th scope="col">Offices</th>
                <th scope="col">
                  <span className={styles.visuallyHidden}>Edit</span>
                </th>
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.month}>
                <tr className={styles.monthRow}>
                  <td colSpan={7}>
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
                      <span className={styles.impact}>
                        👥{" "}
                        {employeesOff(
                          holiday,
                          overview.offices,
                          overview.unassignedCount,
                        ).toLocaleString()}{" "}
                        get the day off
                      </span>
                    </td>
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
        <p className={styles.coverageSub}>Tracked employees per office — who a holiday closes.</p>
        <ul className={styles.coverageList}>
          {overview.offices.map((o) => (
            <li key={o.officeId} className={styles.coverageRow}>
              <span className={styles.coverageName}>{o.name}</span>
              <span className={styles.coverageBar} role="img" aria-label={`${o.staffCount} staff`}>
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
