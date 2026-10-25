import type { ReactNode } from "react";
import styles from "./CleaningArt.module.css";

/**
 * The hand-drawn scene for the cleaning page, in one colour: the primary blue, drawn as lines
 * on a pale tint, with a turbulence filter for the hand-drawn wobble (the house style of
 * NotFoundArt). The scene carries no information, so screen readers skip it. Colours come from
 * the design tokens (see CleaningArt.module.css). The filter id is unique to this scene: several
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

/** Cleaning: the morning round card, the bucket with its cloth and bubbles, and the spray bottle at work on the door corner. */
export function CleaningArt() {
  return (
    <Sketch id="use-case-art-cleaning">
      <path className={styles.tint} d="M96 336q84-16 168-4t92 2q-72 20-146 14t-114-12z" />
      {/* The morning round card with its ticks */}
      <rect className={styles.tint} x="58" y="52" width="132" height="104" rx="8" />
      <path className={styles.thin} d="M76 72h44" />
      <text className={styles.textSmall} x="148" y="78">
        9 AM
      </text>
      <circle className={styles.solid} cx="82" cy="97" r="9" />
      <path className={styles.cutLine} d="M78 97l4 4 8-9" />
      <path className={styles.thin} d="M100 100h68" />
      <circle className={styles.solid} cx="82" cy="121" r="9" />
      <path className={styles.cutLine} d="M78 121l4 4 8-9" />
      <path className={styles.thin} d="M100 124h52" />
      <circle className={styles.tint} cx="82" cy="145" r="9" />
      <path className={styles.thin} d="M100 148h60" />
      {/* The cleaning bucket with its cloth and soap bubbles */}
      <rect className={styles.solid} x="72" y="188" width="96" height="16" rx="8" />
      <path className={styles.tint} d="M80 204h80l-10 92q-26 12-60 0z" />
      <path className={styles.thin} d="M92 232q24 10 48 0" />
      <rect className={styles.tint} x="138" y="196" width="22" height="38" rx="8" />
      <path className={styles.thin} d="M149 212v14" />
      <circle className={styles.solid} cx="98" cy="176" r="4" />
      <circle className={styles.solid} cx="116" cy="164" r="6" />
      <circle className={styles.solid} cx="94" cy="162" r="3" />
      {/* The door, cleaned at its corner */}
      <rect className={styles.tint} x="272" y="76" width="100" height="226" rx="6" />
      <path className={styles.thin} d="M290 96h64v56h-64z" />
      <path className={styles.thin} d="M290 176h64v84h-64z" />
      <circle className={styles.solid} cx="362" cy="170" r="5" />
      <path className={styles.thin} d="M236 306h136" />
      {/* The spray bottle, spraying towards the door */}
      <rect className={styles.tint} x="192" y="214" width="46" height="88" rx="12" />
      <path className={styles.thin} d="M202 246h26" />
      <path className={styles.thin} d="M202 262h18" />
      <rect className={styles.solid} x="206" y="188" width="18" height="28" rx="6" />
      <rect className={styles.solid} x="196" y="162" width="42" height="26" rx="8" />
      <rect className={styles.solid} x="238" y="168" width="12" height="12" rx="3" />
      <path className={styles.thin} d="M206 188q-8 10 0 18" />
      <path className={styles.dashed} d="M256 164q16-8 30-10" />
      <path className={styles.dashed} d="M256 176q18-2 32 6" />
      {/* Sparkle marks on the cleaned floor */}
      <path className={styles.thin} d="M300 272v28" />
      <path className={styles.thin} d="M286 286h28" />
      <path className={styles.thin} d="M292 278l-7-7" />
      <path className={styles.thin} d="M308 278l7-7" />
      <path className={styles.thin} d="M292 294l-7 7" />
      <path className={styles.thin} d="M308 294l7 7" />
      <path className={styles.thin} d="M256 258v16" />
      <path className={styles.thin} d="M248 266h16" />
    </Sketch>
  );
}
