import type { ReactNode } from "react";
import styles from "./SolarArt.module.css";

/**
 * The solar scene: one colour, drawn as lines on a pale tint, with a turbulence filter for the
 * hand-drawn wobble (the house style of NotFoundArt). The scene carries no information, so screen
 * readers skip it. Colours come from the design tokens (see SolarArt.module.css). The filter id is
 * unique to this scene: several scenes could end up in one document through cross-links rendered
 * as prerendered pages.
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

/** Solar installation: the sun over the site, the panel on its stand, the ladder, the survey clipboard. */
export function SolarArt() {
  return (
    <Sketch id="use-case-art-solar">
      <path className={styles.tint} d="M96 336q84-16 168-4t92 2q-72 20-146 14t-114-12z" />
      {/* The sun and its rays */}
      <circle className={styles.solid} cx="80" cy="74" r="24" />
      <path
        className={styles.thin}
        d="M80 38V20M80 110v18M44 74H26M116 74h18M54 48 42 36M106 48l12-12M54 100l-12 12M106 100l12 12"
      />
      {/* The panel on its stand */}
      <rect
        className={styles.solid}
        x="144"
        y="246"
        width="13"
        height="72"
        rx="6"
        transform="rotate(6 150 282)"
      />
      <rect
        className={styles.solid}
        x="258"
        y="232"
        width="13"
        height="86"
        rx="6"
        transform="rotate(-6 264 275)"
      />
      <path className={styles.thin} d="M146 300h124" />
      <g transform="rotate(-8 205 195)">
        <rect className={styles.tint} x="118" y="150" width="174" height="90" rx="8" />
        <path className={styles.thin} d="M176 150v90M234 150v90M118 195h174" />
      </g>
      {/* The ladder against the parapet */}
      <rect className={styles.tint} x="358" y="190" width="46" height="130" rx="8" />
      <path className={styles.thin} d="M326 132l30 186M348 132l30 186" />
      <path className={styles.thin} d="M330 158h23M336 192h23M341 226h23M347 260h23M352 294h23" />
      {/* The survey clipboard */}
      <g transform="rotate(-6 98 286)">
        <rect className={styles.tint} x="48" y="252" width="100" height="68" rx="8" />
        <rect className={styles.solid} x="78" y="244" width="40" height="16" rx="7" />
        <path className={styles.thin} d="M68 286h60M68 304h40" />
      </g>
    </Sketch>
  );
}
