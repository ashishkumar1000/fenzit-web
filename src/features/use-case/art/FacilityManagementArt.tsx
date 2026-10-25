import type { ReactNode } from "react";
import styles from "./FacilityManagementArt.module.css";

/**
 * The hand-drawn scene for the facility management page, in one colour: the primary blue, drawn as
 * lines on a pale tint, with a turbulence filter for the hand-drawn wobble (the house style of
 * NotFoundArt). The scene carries no information, so screen readers skip it. Colours come from the
 * design tokens (see FacilityManagementArt.module.css). The filter id is unique to this scene:
 * several scenes could end up in one document through cross-links rendered as prerendered pages.
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

/** Facility management: the building inside its site boundary, the guard's shield, and the round board. */
export function FacilityManagementArt() {
  return (
    <Sketch id="use-case-art-facility">
      <GroundShadow />
      {/* The building with its rows of windows */}
      <rect className={styles.tint} x="70" y="60" width="120" height="240" rx="8" />
      <rect className={styles.thin} x="88" y="84" width="18" height="24" rx="4" />
      <rect className={styles.thin} x="126" y="84" width="18" height="24" rx="4" />
      <rect className={styles.thin} x="164" y="84" width="18" height="24" rx="4" />
      <rect className={styles.thin} x="88" y="122" width="18" height="24" rx="4" />
      <rect className={styles.solid} x="126" y="122" width="18" height="24" rx="4" />
      <rect className={styles.thin} x="164" y="122" width="18" height="24" rx="4" />
      <rect className={styles.thin} x="88" y="160" width="18" height="24" rx="4" />
      <rect className={styles.thin} x="126" y="160" width="18" height="24" rx="4" />
      <rect className={styles.thin} x="164" y="160" width="18" height="24" rx="4" />
      <path className={styles.solid} d="M117 300v-30q0-8 8-8h10q8 0 8 8v30z" />
      {/* The site boundary with its gate posts */}
      <path className={styles.dashed} d="M48 310v-96q0-14 14-14h196q14 0 14 14v96" />
      <rect className={styles.solid} x="42" y="304" width="12" height="18" rx="4" />
      <rect className={styles.solid} x="266" y="304" width="12" height="18" rx="4" />
      {/* The guard's shield at the corner */}
      <path className={styles.solid} d="M262 88l26 9v22c0 16-12 26-26 30-14-4-26-14-26-30v-22z" />
      <path className={styles.cutLine} d="M251 118l8 8 15-18" />
      {/* The supervisor's round board */}
      <g transform="rotate(-3 302 220)">
        <rect className={styles.tint} x="246" y="150" width="112" height="140" rx="10" />
        <rect className={styles.solid} x="284" y="140" width="36" height="18" rx="7" />
        <text className={styles.textSmall} x="302" y="176">
          Round
        </text>
        <circle className={styles.solid} cx="270" cy="200" r="9" />
        <path className={styles.cutLine} d="M265 200l4 4 8-9" />
        <path className={styles.thin} d="M290 200h46" />
        <circle className={styles.solid} cx="270" cy="230" r="9" />
        <path className={styles.cutLine} d="M265 230l4 4 8-9" />
        <path className={styles.thin} d="M290 230h36" />
        <circle className={styles.thin} cx="270" cy="260" r="10" />
        <path className={styles.thin} d="M292 260h42" />
      </g>
    </Sketch>
  );
}
