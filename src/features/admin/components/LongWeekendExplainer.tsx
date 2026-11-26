// eslint-disable-next-line no-restricted-imports -- the only effect here is showModal() on a conditionally-mounted <dialog> (UI lifecycle, not server data in an effect).
import { useEffect, useId, useRef } from "react";
import styles from "./LongWeekendExplainer.module.css";

/**
 * "How is this calculated?" modal for the LONG WEEKEND BREAKS card (owner
 * request 2026-11-26): the rule explained in plain English with a visual
 * scenario chart for every weekly-off shape — coloured week strips (my UI)
 * + the owner's simple wording. Same dialog idiom as HolidayModal —
 * showModal() on mount so the backdrop blurs the page and background clicks
 * are blocked; content scrolls inside the sheet.
 */

type Cell = "work" | "woff" | "hol" | "add";

interface Strip {
  label: string;
  days: Cell[];
  yes: boolean;
  note: string;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const SECTIONS: { title: string; strips: Strip[] }[] = [
  {
    title: "If Sunday is your only weekly off",
    strips: [
      {
        label: "holidays on Saturday and Monday",
        days: ["hol", "work", "work", "work", "work", "hol", "woff"],
        yes: true,
        note: "Saturday + Sunday + the following Monday all off in a row — 3 days (the Nov 28–30 shape)",
      },
      {
        label: "holiday on Saturday only",
        days: ["work", "work", "work", "work", "work", "hol", "woff"],
        yes: false,
        note: "Saturday + Sunday = only 2 days — a long weekend needs 3",
      },
      {
        label: "holiday on Sunday",
        days: ["work", "work", "work", "work", "work", "work", "add"],
        yes: false,
        note: "swallowed — Sunday was a day off anyway",
      },
      {
        label: "holiday on Monday",
        days: ["hol", "work", "work", "work", "work", "work", "woff"],
        yes: false,
        note: "only Sunday and Monday are off — 2 days",
      },
      {
        label: "holidays Tue–Wed–Thu",
        days: ["work", "hol", "hol", "hol", "work", "work", "woff"],
        yes: true,
        note: "three holidays in a row",
      },
      {
        label: "holidays Thursday + Saturday",
        days: ["work", "work", "work", "hol", "work", "hol", "woff"],
        yes: false,
        note: "the days off are not connected into a break of 3",
      },
    ],
  },
  {
    title: "If Saturday and Sunday are weekly offs",
    strips: [
      {
        label: "holiday on Friday",
        days: ["work", "work", "work", "work", "hol", "woff", "woff"],
        yes: true,
        note: "the classic Fri–Sun long weekend",
      },
      {
        label: "holiday on Monday",
        days: ["hol", "work", "work", "work", "work", "woff", "woff"],
        yes: true,
        note: "Saturday to Monday off",
      },
      {
        label: "holidays Thursday + Friday",
        days: ["work", "work", "work", "hol", "hol", "woff", "woff"],
        yes: true,
        note: "Thursday to Sunday — 4 days",
      },
      {
        label: "holiday on Saturday",
        days: ["work", "work", "work", "work", "work", "add", "woff"],
        yes: false,
        note: "swallowed — the weekend is already 2 days",
      },
    ],
  },
  {
    title: "If Friday and Saturday are weekly offs",
    strips: [
      {
        label: "holiday on Thursday",
        days: ["work", "work", "work", "hol", "woff", "woff", "work"],
        yes: true,
        note: "Thursday to Saturday off",
      },
      {
        label: "holiday on Sunday",
        days: ["work", "work", "work", "work", "woff", "woff", "hol"],
        yes: true,
        note: "Friday to Sunday off",
      },
      {
        label: "holidays Wednesday + Thursday",
        days: ["work", "work", "hol", "hol", "woff", "woff", "work"],
        yes: true,
        note: "Wednesday to Saturday — 4 days",
      },
      {
        label: "holiday on Friday",
        days: ["work", "work", "work", "work", "add", "woff", "work"],
        yes: false,
        note: "swallowed — Friday–Saturday stays a 2-day weekend",
      },
    ],
  },
  {
    title: "If Saturday, Sunday and Monday are weekly offs",
    strips: [
      {
        label: "no holiday at all",
        days: ["woff", "work", "work", "work", "work", "woff", "woff"],
        yes: false,
        note: "the regular 3-day weekend is never reported",
      },
      {
        label: "holiday on Friday",
        days: ["woff", "work", "work", "work", "hol", "woff", "woff"],
        yes: true,
        note: "Friday to Monday — 4 days",
      },
      {
        label: "holiday on Tuesday",
        days: ["woff", "hol", "work", "work", "work", "woff", "woff"],
        yes: true,
        note: "Saturday to Tuesday — 4 days",
      },
      {
        label: "holiday on Saturday",
        days: ["woff", "work", "work", "work", "work", "add", "woff"],
        yes: false,
        note: "swallowed inside the 3-day weekend",
      },
    ],
  },
];

const MATRIX_ROWS: string[][] = [
  ["Monday", "No (2 days)", "Yes (3 days)", "No", "No"],
  ["Tuesday", "No", "No", "No", "Yes (4 days)"],
  ["Wednesday", "No", "No", "No", "No"],
  ["Thursday", "No", "No", "Yes (3 days)", "No"],
  ["Friday", "No", "Yes (3 days)", "No", "Yes (4 days)"],
  ["Saturday", "No (2 days)", "No", "No", "No"],
  ["Sunday", "No", "No", "Yes (3 days)", "No"],
];

const COMBO_ROWS: string[][] = [
  // Every cell executed against longWeekends() (review round 2026-11-26) —
  // under Fri+Sat weekly offs Sunday is a working day, so Sat+Mon holidays
  // never connect; under Sat+Sun+Mon the weekly offs absorb the weekend.
  ["Saturday and Monday", "Yes (3 days)", "Yes (3 days)", "No", "No"],
  ["Thursday and Friday", "No (2 days)", "Yes (4 days)", "Yes (3 days)", "Yes (5 days)"],
  [
    "Tuesday, Wednesday and Thursday",
    "Yes (3 days)",
    "Yes (3 days)",
    "Yes (5 days)",
    "Yes (6 days)",
  ],
];

function MatrixTable({ head, rows }: { head: string; rows: string[][] }) {
  return (
    <table className={styles.matrix}>
      <thead>
        <tr>
          <th>{head}</th>
          <th>Sun only</th>
          <th>Sat + Sun</th>
          <th>Fri + Sat</th>
          <th>Sat + Sun + Mon</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]}>
            <th scope="row">{row[0]}</th>
            {row.slice(1).map((cell, index) => (
              <td key={index} className={cell.startsWith("Yes") ? styles.cellYes : styles.cellNo}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LongWeekendExplainer({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Guarded: StrictMode double-runs mount effects and showModal() on an
  // already-open dialog throws (same guard as HolidayModal).
  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <header className={styles.head}>
        <h3 id={titleId} className={styles.title}>
          How Long Weekends Are Calculated
        </h3>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className={styles.scroll}>
        <p className={styles.body}>
          This feature helps you find holidays that create a longer break by joining with your
          regular weekly days off. For example, if Sunday is your weekly off and Saturday is a
          holiday, you get 2 days off together. If Monday is also a holiday, you get a 3-day break.
        </p>

        <div className={styles.rule}>
          <p className={styles.ruleTitle}>Rule 1 — Which days are counted as off?</p>
          <p className={styles.body}>
            A day is an off-day if it is your regular weekly off (as set by your company), or it is
            a declared holiday.
          </p>
        </div>
        <div className={styles.rule}>
          <p className={styles.ruleTitle}>Rule 2 — When is a break a long weekend?</p>
          <p className={styles.body}>
            The system finds days off that come one after another. If you get 3 or more days off
            together, and at least one of those days is a holiday, the break counts.
          </p>
        </div>
        <div className={styles.rule}>
          <p className={styles.ruleTitle}>Rule 3 — The holiday must give you an extra day.</p>
          <p className={styles.body}>
            A holiday should fall on a day you would normally work. If Diwali falls on Sunday and
            Sunday is already your weekly off, you do not get an extra day — so it is not counted.
          </p>
        </div>
        <div className={styles.rule}>
          <p className={styles.ruleTitle}>Rule 4 — Different offices are handled separately.</p>
          <p className={styles.body}>
            If the holidays in a break apply only to different offices, and no single office gets
            the complete break, it does not count.
          </p>
        </div>

        <div className={styles.legend}>
          <span>
            <i className={`${styles.sw} ${styles.work}`} /> working day
          </span>
          <span>
            <i className={`${styles.sw} ${styles.woff}`} /> weekly off
          </span>
          <span>
            <i className={`${styles.sw} ${styles.hol}`} /> holiday (gives an extra day)
          </span>
          <span>
            <i className={`${styles.sw} ${styles.add}`} /> holiday on a day you are already off
          </span>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h4 className={styles.sectionTitle}>{section.title}</h4>
            <ul className={styles.stripList}>
              {section.strips.map((strip) => (
                <li key={strip.label} className={styles.stripRow}>
                  <span className={styles.week} aria-hidden="true">
                    {strip.days.map((cell, index) => (
                      <i key={index} className={`${styles.day} ${styles[cell]}`}>
                        {DAY_LABELS[index]}
                      </i>
                    ))}
                  </span>
                  <span className={styles.stripBody}>
                    <strong className={strip.yes ? styles.yesTag : styles.noTag}>
                      {strip.yes ? "✓ counted" : "✗ not counted"}
                    </strong>{" "}
                    {strip.label} — <em className={styles.note}>{strip.note}</em>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <h4 className={styles.sectionTitle}>Quick reference — one holiday on each weekday</h4>
        <MatrixTable head="Holiday day" rows={MATRIX_ROWS} />

        <h4 className={styles.sectionTitle}>Examples with multiple holidays</h4>
        <MatrixTable head="Holidays" rows={COMBO_ROWS} />

        <h4 className={styles.sectionTitle}>How the total days are counted</h4>
        <p className={styles.body}>
          The number on the card includes all continuous days off together — Saturday holiday,
          Sunday weekly off, Monday holiday:
        </p>
        <div className={styles.dayRow}>
          <span className={styles.dayChip}>
            <i className={`${styles.dayBox} ${styles.dayHol}`}>S</i>
            Saturday <em>Holiday</em>
          </span>
          <span className={styles.dayChip}>
            <i className={`${styles.dayBox} ${styles.dayWoff}`}>S</i>
            Sunday <em>Weekly off</em>
          </span>
          <span className={styles.dayChip}>
            <i className={`${styles.dayBox} ${styles.dayHol}`}>M</i>
            Monday <em>Holiday</em>
          </span>
          <span className={styles.yesTag}>3 Days Off</span>
        </div>

        <p className={styles.summary}>
          <strong>In simple words:</strong> the system finds holidays that join with your regular
          weekly offs to give you 3 or more days off together. It does not count holidays that fall
          on days you are already off.
        </p>
      </div>

      <footer className={styles.foot}>
        <button type="button" className={styles.okButton} onClick={onClose}>
          Got it
        </button>
      </footer>
    </dialog>
  );
}
