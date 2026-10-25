import type { ReactNode } from "react";
import styles from "./PestControlArt.module.css";

/**
 * The hand-drawn scene for the pest control page, in one colour: the primary blue, drawn as lines
 * on a pale tint, with a turbulence filter for the hand-drawn wobble (the house style of
 * NotFoundArt). The scene carries no information, so screen readers skip it. Colours come from the
 * design tokens (see PestControlArt.module.css). The filter id is unique to this scene: several
 * scenes could end up in one document through cross-links rendered as prerendered pages.
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

/** Pest control: the hand sprayer and its hose, the bug on the floor edge, and the treated shield. */
export function PestControlArt() {
  return (
    <Sketch id="use-case-art-pest">
      <path className={styles.tint} d="M96 336q84-16 168-4t92 2q-72 20-146 14t-114-12z" />
      {/* The hand sprayer with its pump and hose */}
      <rect className={styles.tint} x="84" y="148" width="100" height="112" rx="18" />
      <path className={styles.thin} d="M100 190h68" />
      <text className={styles.textSmall} x="134" y="178">
        5 L
      </text>
      <rect className={styles.solid} x="116" y="118" width="36" height="34" rx="9" />
      <circle className={styles.cut} cx="134" cy="135" r="5" />
      <path className={styles.thin} d="M134 118V98" />
      <rect className={styles.solid} x="112" y="84" width="44" height="14" rx="7" />
      <path className={styles.thin} d="M152 140c56 4 92 40 92 84" />
      <path className={styles.thin} d="M244 224l44 34" />
      <circle className={styles.solid} cx="292" cy="261" r="5" />
      {/* The spray towards the bug */}
      <path className={styles.dashed} d="M298 268q8 6 12 16" />
      <path className={styles.dashed} d="M306 260q14 4 20 14" />
      {/* The bug on the floor edge */}
      <path className={styles.thin} d="M212 300h160" />
      <path className={styles.thin} d="M372 300V222" />
      <circle className={styles.solid} cx="322" cy="286" r="11" />
      <circle className={styles.solid} cx="335" cy="292" r="6" />
      <path className={styles.thin} d="M339 287q7-5 12-4" />
      <path className={styles.thin} d="M340 295q8 1 12 6" />
      <path className={styles.thin} d="M314 277l-9-7" />
      <path className={styles.thin} d="M322 274l2-11" />
      <path className={styles.thin} d="M313 294l-10 6" />
      {/* The treated shield */}
      <path className={styles.solid} d="M300 62l42 15v36c0 28-19 44-42 50-23-6-42-22-42-50V77z" />
      <path className={styles.cutLine} d="M281 118l14 14 25-29" />
    </Sketch>
  );
}
