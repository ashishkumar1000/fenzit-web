import styles from "./HolidaysArt.module.css";

/**
 * Decorative background for the holidays card: a calendar sheet with binder
 * rings and a highlighted day, with confetti around it. Original flat shapes,
 * right half only — the left stays quiet for the card's text.
 */
export function HolidaysArt() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 320 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* halo disc behind the sheet */}
      <circle className={styles.soft} cx="248" cy="76" r="58" />
      {/* calendar sheet */}
      <rect className={styles.sheet} x="196" y="42" width="104" height="88" rx="12" />
      {/* binder rings */}
      <rect className={styles.ring} x="222" y="32" width="8" height="20" rx="4" />
      <rect className={styles.ring} x="266" y="32" width="8" height="20" rx="4" />
      {/* header strip */}
      <path className={styles.accentBand} d="M196 66h104v14H196z" />
      {/* highlighted day + quiet days */}
      <rect className={styles.day} x="240" y="90" width="18" height="16" rx="4" />
      <rect className={styles.dot} x="212" y="90" width="12" height="12" rx="3" />
      <rect className={styles.dot} x="272" y="90" width="12" height="12" rx="3" />
      <rect className={styles.dot} x="212" y="108" width="12" height="12" rx="3" />
      <rect className={styles.dot} x="240" y="112" width="18" height="8" rx="3" />
      {/* confetti */}
      <circle className={styles.confetti} cx="188" cy="34" r="4" />
      <circle className={styles.confettiDim} cx="312" cy="128" r="3" />
      <path className={styles.confetti} d="M176 116l6 10h-12z" />
      <path className={styles.confettiDim} d="M306 30v10M301 35h10" />
    </svg>
  );
}
