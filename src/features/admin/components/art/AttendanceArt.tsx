import styles from "./AttendanceArt.module.css";

/**
 * Decorative background for the attendance card. A soft quarter-circle clock
 * face sits in the upper right with two hands and a notch marking the quarter
 * hour; a thick heartbeat ribbon runs beneath it, ended by round caps, with a
 * "done" bead resting on the line. Everything is a flat fill, the left half
 * stays quiet for text, and it carries no information, so screen readers skip
 * it. Colours come from the design tokens (see AttendanceArt.module.css).
 */
export function AttendanceArt() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 320 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* Quarter-circle clock face anchored on the right half. */}
      <path className={styles.disc} d="M250 100v-52a52 52 0 0 1 52 52Z" />

      {/* Quarter-hour notch cut into the clock's rim. */}
      <circle className={styles.tick} cx="286.8" cy="63.2" r="4" />

      {/* Two hands from the face's corner: one to twelve, one toward the notch. */}
      <rect className={styles.handUp} x="246.5" y="60" width="7" height="40" rx="3.5" />
      <rect
        className={styles.handTilt}
        x="250"
        y="96.5"
        width="26"
        height="7"
        rx="3.5"
        transform="rotate(-45 250 100)"
      />
      <circle className={styles.hub} cx="250" cy="100" r="4.5" />

      {/* Quiet warm accent drifting inside the face. */}
      <circle className={styles.dotAccent} cx="290" cy="86" r="4.5" />

      {/* Heartbeat ribbon: one filled outline, round caps, no strokes. */}
      <path
        className={styles.pulse}
        d="M178 116h17.5l21.6-21.5q4.9-4.9 9.8 0l21.5 21.5h11l7-7q3.5-3.5 7 0l7 7h17.5a6 6 0 0 1 0 12l-22.5 0-5.5-5.5-2 5.5h-24.5l-21.5-21.5-21.5 21.5h-22.5a6 6 0 0 1 0-12Z"
      />

      {/* A "done" bead resting on the heartbeat line. */}
      <circle className={styles.dotDone} cx="186" cy="122" r="6" />
    </svg>
  );
}
