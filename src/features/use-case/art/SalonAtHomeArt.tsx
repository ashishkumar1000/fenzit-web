import type { ReactNode } from "react";
import styles from "./SalonAtHomeArt.module.css";

/**
 * Hand-drawn scene for the salon-at-home page, in one colour: the primary blue, drawn as lines on
 * a pale tint, with a turbulence filter for the hand-drawn wobble (the house style of NotFoundArt).
 * The scene carries no information, so screen readers skip it. Colours come from the design
 * tokens (see SalonAtHomeArt.module.css). The filter id is unique to this scene: several scenes
 * could end up in one document through cross-links rendered as prerendered pages.
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

/** Salon at home: the hand mirror, the dryer at work, the kit bag, and today's appointment card. */
export function SalonAtHomeArt() {
  return (
    <Sketch id="use-case-art-salon">
      <GroundShadow />
      {/* The hand mirror */}
      <circle className={styles.tint} cx="118" cy="106" r="46" />
      <path className={styles.thin} d="M90 88q8-16 26-18" />
      <rect className={styles.solid} x="109" y="148" width="18" height="62" rx="9" />
      <circle className={styles.cut} cx="118" cy="198" r="4" />
      {/* The hair dryer and its airflow */}
      <g transform="rotate(-20 320 150)">
        <rect className={styles.tint} x="272" y="126" width="88" height="42" rx="20" />
        <rect className={styles.solid} x="358" y="136" width="16" height="22" rx="5" />
        <circle className={styles.cut} cx="286" cy="147" r="7" />
        <rect className={styles.solid} x="304" y="164" width="18" height="56" rx="9" />
      </g>
      <path className={styles.thin} d="M380 112q16 4 28-4" />
      <path className={styles.thin} d="M386 128h26" />
      <path className={styles.thin} d="M380 144q16-4 28 4" />
      {/* The salon kit bag */}
      <path className={styles.tint} d="M142 226l18-48h104l18 48z" />
      <path className={styles.thin} d="M190 178q22-24 44 0" />
      <path className={styles.thin} d="M160 198h104" />
      <circle className={styles.solid} cx="212" cy="198" r="6" />
      {/* Today's appointment card, signed off */}
      <g transform="rotate(-4 311 279)">
        <rect className={styles.tint} x="248" y="240" width="126" height="78" rx="8" />
        <path className={styles.thin} d="M304 260h52" />
        <circle className={styles.solid} cx="277" cy="282" r="15" />
        <path className={styles.cutLine} d="M270 282l6 6 11-13" />
        <text className={styles.textSmall} x="332" y="289">
          Today
        </text>
      </g>
    </Sketch>
  );
}
