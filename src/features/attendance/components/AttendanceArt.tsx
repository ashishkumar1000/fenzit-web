import styles from "./AttendanceArt.module.css";

/**
 * Decorative scene for the attendance page, in one colour: the primary blue, drawn as lines on a
 * pale tint. An office sits inside a dashed geofence, a phone shows the check-in button, and a
 * leave calendar sits beside them. It carries no information, so screen readers skip it. Colours
 * come from the design tokens (see AttendanceArt.module.css).
 */
export function AttendanceArt() {
  return (
    <svg className={styles.art} viewBox="0 0 420 360" aria-hidden="true" focusable="false">
      <defs>
        <filter id="attendance-art-sketch" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="4" />
        </filter>
      </defs>

      <g filter="url(#attendance-art-sketch)">
        {/* Ground shadow */}
        <path className={styles.tint} d="M96 336q84-16 168-4t92 2q-72 20-146 14t-114-12z" />

        {/* Geofence around the office */}
        <circle className={styles.dashed} cx="100" cy="195" r="78" />

        {/* Office */}
        <rect className={styles.tint} x="56" y="152" width="88" height="78" rx="6" />
        <path className={styles.thin} d="M74 168h20v20H74zM118 168h14v20h-14zM74 202h14v28H74z" />
        <rect className={styles.solid} x="108" y="200" width="20" height="30" rx="8" />

        {/* Location pin on the office roof */}
        <path className={styles.solid} d="M100 142c-14-16-14-34 0-34 14 0 14 18 0 34z" />
        <circle className={styles.cut} cx="100" cy="118" r="6" />

        {/* Phone with the check-in button */}
        <rect className={styles.tint} x="252" y="96" width="112" height="212" rx="20" />
        <rect className={styles.thin} x="264" y="116" width="88" height="158" rx="8" />
        <path className={styles.thin} d="M292 108h32" />
        <text className={styles.textSmall} x="308" y="146">
          8:45 AM
        </text>
        <circle className={styles.solid} cx="308" cy="206" r="33" />
        <path className={styles.cutLine} d="M293 206l11 11 20-23" />
        <path className={styles.thin} d="M282 260h52" />

        {/* Leave calendar */}
        <rect className={styles.tint} x="152" y="252" width="90" height="76" rx="8" />
        <path className={styles.thin} d="M152 274h90" />
        <path className={styles.solid} d="M170 244v14M224 244v14" />
        <path className={styles.cutLine} d="M186 300l10 10 18-20" />
      </g>
    </svg>
  );
}
