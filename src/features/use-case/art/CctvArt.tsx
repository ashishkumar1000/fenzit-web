import type { ReactNode } from "react";
import styles from "./CctvArt.module.css";

/**
 * The hand-drawn scene for the CCTV page, in one colour: the primary blue, drawn as lines on a
 * pale tint, with a turbulence filter for the hand-drawn wobble (the house style of NotFoundArt).
 * The scene carries no information, so screen readers skip it. Colours come from the design
 * tokens (see CctvArt.module.css). Filter ids are unique per scene: several scenes could end
 * up in one document through cross-links rendered as prerendered pages.
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

/** CCTV installers: the bullet camera on its bracket, the cable run to the monitor, and the signed handover. */
export function CctvArt() {
  return (
    <Sketch id="use-case-art-cctv">
      <GroundShadow />
      {/* The bullet camera on its wall bracket */}
      <rect className={styles.solid} x="78" y="76" width="16" height="96" rx="7" />
      <path className={styles.thin} d="M94 104h18M94 140l26-16" />
      <circle className={styles.solid} cx="120" cy="104" r="8" />
      <rect className={styles.tint} x="112" y="78" width="116" height="46" rx="13" />
      <path className={styles.thin} d="M118 70h110" />
      <circle className={styles.solid} cx="238" cy="101" r="19" />
      <circle className={styles.cut} cx="238" cy="101" r="8" />
      {/* The cable run down the wall and along the ground */}
      <path className={styles.thin} d="M114 114c-30 10-30 26-30 62v124c0 16 10 24 26 24h162" />
      {/* The monitor with its four views */}
      <rect className={styles.tint} x="236" y="210" width="140" height="96" rx="8" />
      <path className={styles.thin} d="M306 214v88M240 258h132" />
      <circle className={styles.solid} cx="271" cy="234" r="10" />
      <text className={styles.textSmall} x="341" y="292">
        Live
      </text>
      <rect className={styles.solid} x="290" y="306" width="32" height="12" rx="5" />
      <path className={styles.thin} d="M272 330h68" />
      {/* The tick: the handover is signed */}
      <circle className={styles.solid} cx="354" cy="88" r="26" />
      <path className={styles.cutLine} d="M341 88l10 10 18-22" />
    </Sketch>
  );
}
