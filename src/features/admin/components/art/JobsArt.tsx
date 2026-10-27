import styles from "./JobsArt.module.css";

/**
 * Decorative background for the admin jobs card: an abstract job board on the right
 * half of the canvas. A soft grey board carries a queued stack, two in-progress
 * cards, a finished card with a check tick, a fading progress-dot trail and a
 * spark. The left half stays empty so text can sit over it. Pure flat fills, no
 * strokes; it carries no information, so screen readers skip it. Colours come from
 * the design tokens (see JobsArt.module.css).
 */
export function JobsArt() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 320 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* The board */}
      <rect className={styles.board} x="168" y="14" width="140" height="132" rx="18" />
      <rect className={styles.boardBar} x="182" y="26" width="74" height="8" rx="4" />

      {/* Queued jobs: a stacked card peeking out behind the in-progress column */}
      <rect className={styles.stackCard} x="176" y="38" width="52" height="36" rx="8" />

      {/* In-progress column */}
      <rect className={styles.cardProgress} x="182" y="44" width="52" height="36" rx="8" />
      <rect className={styles.cardProgress} x="182" y="88" width="52" height="36" rx="8" />

      {/* Done column: finished card with its check tick */}
      <rect className={styles.cardDone} x="242" y="44" width="52" height="36" rx="8" />
      <path className={styles.tick} d="M253 62 266 75 285 56 281 50 266 65 259 58Z" />

      {/* Progress-dot trail fading into the empty slot */}
      <circle className={styles.dotStrong} cx="250" cy="106" r="4" />
      <circle className={styles.dotMid} cx="266" cy="106" r="4" />
      <circle className={styles.dotFaint} cx="282" cy="106" r="4" />

      {/* Spark over the board's corner */}
      <path
        className={styles.spark}
        d="M300 6Q303 21 314 24Q303 27 300 42Q297 27 286 24Q297 21 300 6Z"
      />
    </svg>
  );
}
