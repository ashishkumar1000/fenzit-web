import type { ReactNode } from "react";
import styles from "./ApplianceRepairArt.module.css";

/**
 * The appliance-repair scene in the hand-drawn house style: one colour, the primary blue, drawn as
 * lines on a pale tint, with a turbulence filter for the hand-drawn wobble (the house style of
 * NotFoundArt). The scene carries no information, so screen readers skip it. Colours come from the
 * design tokens (see ApplianceRepairArt.module.css). The filter id is unique to this scene: several
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

function GroundShadow() {
  return <path className={styles.tint} d="M96 336q84-16 168-4t92 2q-72 20-146 14t-114-12z" />;
}

/** Appliance repair: the washing machine with its door open, the wrench, and the fixed tag. */
export function ApplianceRepairArt() {
  return (
    <Sketch id="use-case-art-appliance">
      <GroundShadow />
      {/* The washing machine */}
      <rect className={styles.tint} x="116" y="96" width="160" height="216" rx="14" />
      <path className={styles.thin} d="M116 140h160" />
      <circle className={styles.solid} cx="144" cy="118" r="9" />
      <circle className={styles.thin} cx="244" cy="118" r="7" />
      <path className={styles.thin} d="M172 118h44" />
      {/* The drum opening */}
      <circle className={styles.thin} cx="196" cy="230" r="52" />
      <circle className={styles.tint} cx="196" cy="230" r="40" />
      {/* The door, swung open on its hinge */}
      <path className={styles.thin} d="M276 226h10" />
      <g transform="rotate(16 306 230)">
        <rect className={styles.tint} x="280" y="182" width="52" height="96" rx="12" />
        <circle className={styles.thin} cx="306" cy="230" r="17" />
      </g>
      {/* The wrench leaning against the machine */}
      <g transform="rotate(18 78 310)">
        <circle className={styles.solid} cx="78" cy="160" r="24" />
        <circle className={styles.cut} cx="78" cy="160" r="10" />
        <rect className={styles.solid} x="69" y="178" width="18" height="130" rx="9" />
      </g>
      {/* The finished-job tag, tied to the machine */}
      <path className={styles.dashed} d="M276 100q22-6 38 8" />
      <g transform="rotate(6 344 128)">
        <rect className={styles.tint} x="300" y="96" width="88" height="66" rx="10" />
        <circle className={styles.cut} cx="314" cy="112" r="5" />
        <circle className={styles.solid} cx="318" cy="134" r="13" />
        <path className={styles.cutLine} d="M312 134l5 5 10-11" />
        <text className={styles.textSmall} x="356" y="140">
          Fixed
        </text>
      </g>
    </Sketch>
  );
}
