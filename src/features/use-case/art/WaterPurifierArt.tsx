import type { ReactNode } from "react";
import styles from "./WaterPurifierArt.module.css";

/**
 * Hand-drawn scenes for the use-case pages, in one colour: the primary blue, drawn as lines on a
 * pale tint, with a turbulence filter for the hand-drawn wobble (the house style of NotFoundArt).
 * Each scene carries no information, so screen readers skip it. Colours come from the design
 * tokens (see WaterPurifierArt.module.css). Filter ids are unique per scene: several scenes could
 * end up in one document through cross-links rendered as prerendered pages.
 */

function Sketch({ id, children }: { id: string; children: ReactNode }) {
  return (
    <svg className={styles.art} viewBox="0 0 420 360" aria-hidden="true" focusable="false">
      <defs>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="4" />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>{children}</g>
    </svg>
  );
}

function GroundShadow() {
  return <path className={styles.tint} d="M96 336q84-16 168-4t92 2q-72 20-146 14t-114-12z" />;
}

/** RO service: the purifier on the wall, the water it gives, and the visit card with its tick. */
export function WaterPurifierArt() {
  return (
    <Sketch id="use-case-art-water">
      <GroundShadow />
      {/* The purifier on the wall */}
      <rect className={styles.solid} x="148" y="60" width="16" height="16" rx="4" />
      <rect className={styles.solid} x="256" y="60" width="16" height="16" rx="4" />
      <rect className={styles.tint} x="120" y="74" width="180" height="152" rx="14" />
      <path className={styles.thin} d="M142 108h136" />
      <circle className={styles.solid} cx="276" cy="94" r="5" />
      <path className={styles.tint} d="M210 136q-17 24 0 36 17-12 0-36z" />
      {/* The tap and the water */}
      <rect className={styles.solid} x="198" y="226" width="24" height="16" rx="6" />
      <path className={styles.tint} d="M210 252q-9 13 0 20 9-7 0-20z" />
      <path className={styles.tint} d="M204 286q-7 10 0 15 7-5 0-15z" />
      {/* The glass */}
      <path className={styles.thin} d="M178 288l8 42h48l8-42" />
      {/* The service card */}
      <rect
        className={styles.tint}
        x="306"
        y="134"
        width="94"
        height="62"
        rx="8"
        transform="rotate(-4 353 165)"
      />
      <circle className={styles.solid} cx="330" cy="165" r="13" transform="rotate(-4 353 165)" />
      <path className={styles.cutLine} d="M324 165l6 6 11-13" transform="rotate(-4 353 165)" />
      <text className={styles.textSmall} x="368" y="171" transform="rotate(-4 353 165)">
        AMC
      </text>
    </Sketch>
  );
}
