import type { ReactNode } from "react";
import styles from "./ElectricianArt.module.css";

/**
 * The electrician scene, in one colour: the primary blue, drawn as lines on a pale tint, with a
 * turbulence filter for the hand-drawn wobble (the house style of NotFoundArt). The scene carries
 * no information, so screen readers skip it. Colours come from the design tokens (see
 * ElectricianArt.module.css). The filter id is unique to this scene: several scenes could end up
 * in one document through cross-links rendered as prerendered pages.
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

/** Electricians: the lit bulb on its wire, the switchboard, the two-pin plug, and the finished job card. */
export function ElectricianArt() {
  return (
    <Sketch id="use-case-art-electrician">
      <GroundShadow />
      {/* The lit bulb and the wire from the board */}
      <path className={styles.thin} d="M100 34v-12" />
      <path className={styles.thin} d="M74 52l-9-9" />
      <path className={styles.thin} d="M126 52l9-9" />
      <path className={styles.thin} d="M58 78h-13" />
      <path className={styles.thin} d="M142 78h13" />
      <circle className={styles.tint} cx="100" cy="78" r="30" />
      <path className={styles.thin} d="M88 90q12-16 24 0" />
      <rect className={styles.solid} x="90" y="106" width="20" height="15" rx="5" />
      <path className={styles.thin} d="M236 92q-58 24-108 12" />
      {/* The switchboard with its rockers and sockets */}
      <rect className={styles.tint} x="236" y="64" width="136" height="168" rx="12" />
      <circle className={styles.thin} cx="250" cy="78" r="4" />
      <circle className={styles.thin} cx="358" cy="78" r="4" />
      <rect className={styles.solid} x="254" y="100" width="30" height="48" rx="7" />
      <rect className={styles.solid} x="289" y="100" width="30" height="48" rx="7" />
      <rect className={styles.solid} x="324" y="100" width="30" height="48" rx="7" />
      <path className={styles.cutLine} d="M269 112v24" />
      <path className={styles.cutLine} d="M304 112v24" />
      <path className={styles.cutLine} d="M339 112v24" />
      <circle className={styles.thin} cx="272" cy="186" r="16" />
      <circle className={styles.solid} cx="266" cy="186" r="3" />
      <circle className={styles.solid} cx="278" cy="186" r="3" />
      <circle className={styles.thin} cx="336" cy="186" r="16" />
      <circle className={styles.solid} cx="330" cy="186" r="3" />
      <circle className={styles.solid} cx="342" cy="186" r="3" />
      {/* The big two-pin plug on its cable */}
      <rect className={styles.tint} x="56" y="168" width="120" height="88" rx="18" />
      <rect className={styles.solid} x="176" y="190" width="36" height="13" rx="6" />
      <rect className={styles.solid} x="176" y="221" width="36" height="13" rx="6" />
      <path className={styles.thin} d="M76 196h40" />
      <path className={styles.thin} d="M76 230h40" />
      <path className={styles.thin} d="M56 212q-34 8-32 44t44 28q16 0 26-10" />
      {/* The job card, ticked */}
      <rect className={styles.tint} x="252" y="252" width="124" height="66" rx="9" />
      <rect className={styles.solid} x="266" y="270" width="28" height="28" rx="7" />
      <path className={styles.cutLine} d="M274 284l7 7 13-15" />
      <path className={styles.thin} d="M306 276h54" />
      <path className={styles.thin} d="M306 296h40" />
    </Sketch>
  );
}
