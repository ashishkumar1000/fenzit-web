import styles from "./glyphs.module.css";

/**
 * Hand-drawn glyphs for the console — original artwork, no icon library.
 * Every glyph lives on a 24×24 grid with a 1.5 stroke, round caps and joins,
 * and strokes inherit currentColor so a glyph takes the colour of the text
 * beside it. All are decorative; surrounding text carries the meaning, so
 * they are hidden from screen readers.
 */

type GlyphProps = { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    focusable: false as const,
  };
}

/** A magnifier over a record card — the Inspect section. */
export function GlyphInspect({ size = 20 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h6A2.5 2.5 0 0 1 15 5.5v5.2" />
      <path d="M7 8h5M7 11h3.5" />
      <circle cx="15.5" cy="15.5" r="4.5" />
      <path d="M19 19l2.5 2.5" />
    </svg>
  );
}

/** An identity card with a face and lines — the Account section. */
export function GlyphAccount({ size = 20 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="8.5" cy="10.5" r="1.9" />
      <path d="M5.8 15.6c.6-1.8 4.8-1.8 5.4 0" />
      <path d="M14 9.5h4M14 13h2.6" />
    </svg>
  );
}

/** An office tower with an annex — the Company section. */
export function GlyphCompany({ size = 20 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <path d="M4 21V5.5A2.5 2.5 0 0 1 6.5 3h6A2.5 2.5 0 0 1 15 5.5V21" />
      <path d="M15 10h3a2 2 0 0 1 2 2v9" />
      <path d="M3 21h18" />
      <path d="M7.5 7.5H9M12 7.5h1.5M7.5 11H9M12 11h1.5" />
      <path d="M10 21v-3.5h2.5V21" />
    </svg>
  );
}

/** A single person — the Me section. */
export function GlyphMe({ size = 20 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.9-4.2 12.1-4.2 13 0" />
    </svg>
  );
}

/** Two overlapping contact cards — the Customers section. */
export function GlyphCustomers({ size = 20 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <rect x="3" y="7" width="13" height="12" rx="2.5" />
      <path d="M8 21h11a2 2 0 0 0 2-2v-8" />
      <circle cx="8" cy="12" r="1.7" />
      <path d="M5.6 16.4c.5-1.5 4.3-1.5 4.8 0" />
      <path d="M11.5 11h2.5M11.5 14.5h2" />
    </svg>
  );
}

/** A checklist board — the Jobs section. */
export function GlyphJobs({ size = 20 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M8 8.2l1.6 1.6 3-3.2" />
      <path d="M8 15h8M8 18h5" />
    </svg>
  );
}

/** A calendar page with a highlighted day — the Holidays section. */
export function GlyphHolidays({ size = 20 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 9.5h17" />
      <rect x="10.5" y="12.5" width="4" height="4" rx="1" />
    </svg>
  );
}

/** A clock with a pulse tail — the Attendance section. */
export function GlyphAttendance({ size = 20 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M10.5 7.5v3.4l2.4 1.6" />
      <path d="M14 17.5h2.5l1.5-2.5 1.8 4 1.7-3h1.5" />
    </svg>
  );
}

/** A plain magnifier — the search submit affordance. */
export function GlyphSearch({ size = 18 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <circle cx="11" cy="11" r="6" />
      <path d="M15.5 15.5L20 20" />
    </svg>
  );
}

/** A shield with a check — staff-only markers. */
export function GlyphShield({ size = 16 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <path d="M12 3l7 2.4v5.1c0 4.4-2.9 7.4-7 9.5-4.1-2.1-7-5.1-7-9.5V5.4z" />
      <path d="M9 11.6l2.1 2.1 4-4.2" />
    </svg>
  );
}

/** A small key — flag controls. */
export function GlyphKey({ size = 16 }: GlyphProps) {
  return (
    <svg {...base(size)} className={styles.line}>
      <circle cx="8" cy="14" r="3.5" />
      <path d="M10.5 11.5L19 3M15.5 6.5L18 9M13 9l2 2" />
    </svg>
  );
}

/**
 * The console's hero scene: a dossier card mid-inspection — badge, redacted
 * rows, a magnifier that catches the light, sparkles. Fresh artwork for this
 * page, in the same sketchy spirit as the sign-up art.
 */
export function ConsoleArt() {
  return (
    <svg
      className={`${styles.art} ${styles.line}`}
      viewBox="0 0 440 240"
      aria-hidden="true"
      focusable="false"
    >
      {/* back card, fanned */}
      <rect className={styles.soft} x="86" y="46" width="210" height="140" rx="14" />
      {/* front dossier card */}
      <rect className={styles.card} x="66" y="62" width="210" height="140" rx="14" />
      {/* face chip + name bars */}
      <circle className={styles.inkThin} cx="104" cy="102" r="16" />
      <path className={styles.inkThin} d="M94 112c2-8 18-8 20 0" />
      <path className={styles.inkBold} d="M132 94h74M132 108h52" />
      {/* redacted rows */}
      <path className={styles.thin} d="M88 138h126M88 154h104M88 170h118" />
      {/* staff badge, top right of the card */}
      <circle className={styles.accent} cx="252" cy="86" r="14" />
      <path className={styles.accent} d="M246 86l4 4 8-8" />
      <path className={styles.accent} d="M252 100v12l-6-4M252 112l6-4" />
      {/* magnifier over the corner */}
      <circle className={styles.accent} cx="296" cy="168" r="26" />
      <path className={styles.accent} d="M315 187l26 26" />
      <path className={styles.thin} d="M284 160a16 16 0 0 1 14-8" />
      {/* sparkles */}
      <path className={styles.accent} d="M330 60v14M323 67h14" />
      <path className={styles.thin} d="M52 44v10M47 49h10" />
      <path className={styles.thin} d="M368 128v10M363 133h10" />
      <circle className={styles.accent} cx="60" cy="180" r="3" />
      <circle className={styles.accent} cx="386" cy="86" r="2.5" />
    </svg>
  );
}
