import type { ReactNode } from "react";
import styles from "./ServiceBusinessArt.module.css";

/**
 * The hand-drawn scene for the service-business page, in one colour: the primary blue, drawn as
 * lines on a pale tint, with a turbulence filter for the hand-drawn wobble (the house style of
 * NotFoundArt). The scene carries no information, so screen readers skip it. Colours come from the
 * design tokens (see ServiceBusinessArt.module.css). The filter id is unique to this scene: several
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

/** Service business: the shop with its awning, the day's checklist on the owner's phone, and the staff outside. */
export function ServiceBusinessArt() {
  return (
    <Sketch id="use-case-art-service">
      {/* Ground shadow */}
      <path className={styles.tint} d="M96 336q84-16 168-4t92 2q-72 20-146 14t-114-12z" />
      {/* The shopfront: body, windows and door */}
      <rect className={styles.tint} x="60" y="118" width="140" height="174" rx="6" />
      <path className={styles.thin} d="M74 180h26v28h-26zM160 180h26v28h-26z" />
      <path className={styles.thin} d="M87 180v28M74 194h26M173 180v28M160 194h26" />
      <rect className={styles.solid} x="106" y="216" width="48" height="76" rx="8" />
      <circle className={styles.cut} cx="146" cy="256" r="4" />
      {/* The awning with its scalloped edge */}
      <path
        className={styles.solid}
        d="M46 90h168v24a14 14 0 0 1-28 0 14 14 0 0 1-28 0 14 14 0 0 1-28 0 14 14 0 0 1-28 0 14 14 0 0 1-28 0 14 14 0 0 1-28 0V90z"
      />
      {/* The owner's phone with the day's checklist */}
      <rect className={styles.tint} x="268" y="64" width="104" height="176" rx="18" />
      <path className={styles.thin} d="M302 80h36" />
      <text className={styles.textSmall} x="320" y="116">
        JOBS
      </text>
      <rect className={styles.solid} x="284" y="138" width="16" height="16" rx="5" />
      <path className={styles.cutLine} d="M288 146l4 4 8-9" />
      <path className={styles.thin} d="M310 146h46" />
      <rect className={styles.solid} x="284" y="170" width="16" height="16" rx="5" />
      <path className={styles.cutLine} d="M288 178l4 4 8-9" />
      <path className={styles.thin} d="M310 178h46" />
      <rect className={styles.thin} x="284" y="202" width="16" height="16" rx="5" />
      <path className={styles.thin} d="M310 210h46" />
      <path className={styles.thin} d="M304 226h32" />
      {/* Three of the staff, heads and shoulders, waiting by the shop */}
      <circle className={styles.solid} cx="244" cy="264" r="13" />
      <path className={styles.solid} d="M220 300c0-15 11-24 24-24s24 9 24 24z" />
      <circle className={styles.solid} cx="304" cy="262" r="14" />
      <path className={styles.solid} d="M278 302c0-16 12-26 26-26s26 10 26 26z" />
      <circle className={styles.solid} cx="362" cy="266" r="12" />
      <path className={styles.solid} d="M340 300c0-14 10-22 22-22s22 8 22 22z" />
    </Sketch>
  );
}
