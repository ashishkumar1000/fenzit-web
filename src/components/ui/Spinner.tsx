import styles from "./Spinner.module.css";

/**
 * Hand-authored loader (2026-11-14), researched from modern indeterminate
 * loader patterns (dual-arc rotation, Material-style dash-offset arcs,
 * Apple's activity patterns) and drawn for the console — no library path
 * data is copied.
 *
 * Two arcs share one hand-drawn circle (cx 12, cy 12, r 10 in a 24×24
 * viewBox, normalised to pathLength 100 so the dash maths is length-free):
 * a longer bright lead arc whose dash slides with an eased speed pulse,
 * and a shorter, dimmer trail arc that counter-rotates more slowly for
 * depth. Both stroke in currentColor, so the loader inherits the button
 * or text colour it sits in. Reduced-motion users get a gentle opacity
 * pulse instead of any spinning.
 */
export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      className={styles.spinner}
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <g className={styles.arcLead}>
        <circle
          className={styles.lead}
          cx="12"
          cy="12"
          r="10"
          pathLength={100}
          strokeWidth={2.5}
          strokeLinecap="round"
          stroke="currentColor"
        />
      </g>
      <g className={styles.arcTrail}>
        <circle
          className={styles.trail}
          cx="12"
          cy="12"
          r="10"
          pathLength={100}
          strokeWidth={2.5}
          strokeLinecap="round"
          stroke="currentColor"
        />
      </g>
    </svg>
  );
}
