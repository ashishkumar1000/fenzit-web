import type { ReactNode } from "react";
import styles from "./GeofencingArt.module.css";

/**
 * Decorative scene for the geofencing page, in one colour: the primary blue, drawn as lines on a
 * pale tint, with a turbulence filter for the hand-drawn wobble (the house style of NotFoundArt).
 * The office and the checking-in phone sit inside a dashed check-in boundary, and a pin marks the
 * boundary line. It carries no information, so screen readers skip it. Colours come from the
 * design tokens (see GeofencingArt.module.css). The filter id is unique to this scene: several
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

/** Geofenced attendance: the office and the check-in phone inside the boundary, a pin on its line. */
export function GeofencingArt() {
  return (
    <Sketch id="use-case-art-geofence">
      {/* Ground shadow */}
      <path className={styles.tint} d="M96 336q84-16 168-4t92 2q-72 20-146 14t-114-12z" />
      {/* The check-in boundary */}
      <circle className={styles.dashed} cx="210" cy="180" r="140" />
      {/* The office inside the boundary */}
      <rect className={styles.tint} x="118" y="212" width="94" height="70" rx="6" />
      <path className={styles.thin} d="M134 228h22v20h-22zM176 228h16v20h-16z" />
      <rect className={styles.solid} x="150" y="252" width="20" height="30" rx="8" />
      {/* The phone with the verified tick, inside the boundary */}
      <rect className={styles.tint} x="238" y="100" width="82" height="152" rx="16" />
      <path className={styles.thin} d="M267 112h24" />
      <circle className={styles.solid} cx="279" cy="176" r="30" />
      <path className={styles.cutLine} d="M266 176l10 10 18-21" />
      <path className={styles.thin} d="M261 228h36" />
      {/* The pin on the boundary line */}
      <path className={styles.solid} d="M111 81c-14-16-14-34 0-34 14 0 14 18 0 34z" />
      <circle className={styles.cut} cx="111" cy="57" r="6" />
    </Sketch>
  );
}
