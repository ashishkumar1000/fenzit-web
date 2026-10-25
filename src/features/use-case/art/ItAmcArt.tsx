import type { ReactNode } from "react";
import styles from "./ItAmcArt.module.css";

/**
 * Hand-drawn scene for the IT AMC page, in one colour: the primary blue, drawn as lines on a pale
 * tint, with a turbulence filter for the hand-drawn wobble (the house style of NotFoundArt). The
 * scene carries no information, so screen readers skip it. Colours come from the design tokens
 * (see ItAmcArt.module.css). The filter id is unique to this scene: several scenes could end up
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

/** IT and computer AMC: the open laptop and its screwdriver, the engineer's service tag, and the signed-off badge. */
export function ItAmcArt() {
  return (
    <Sketch id="use-case-art-itamc">
      <GroundShadow />
      {/* The service tag on its lanyard */}
      <path className={styles.thin} d="M52 44q-4 74 40 146" />
      <path className={styles.thin} d="M134 44q4 74-40 146" />
      <g transform="rotate(-6 92 230)">
        <rect className={styles.tint} x="52" y="176" width="80" height="108" rx="8" />
        <circle className={styles.cut} cx="92" cy="196" r="6" />
        <text className={styles.textSmall} x="92" y="226">
          AMC
        </text>
        <path className={styles.thin} d="M70 240h44" />
        <path className={styles.thin} d="M70 254h30" />
        <path className={styles.thin} d="M70 266v10M80 266v10M90 266v10M100 266v10M110 266v10" />
      </g>
      {/* The open laptop */}
      <rect className={styles.tint} x="150" y="88" width="164" height="108" rx="8" />
      <path className={styles.thin} d="M168 118h122" />
      <path className={styles.thin} d="M168 138h86" />
      <rect className={styles.solid} x="190" y="192" width="84" height="16" rx="8" />
      <rect className={styles.solid} x="124" y="204" width="216" height="26" rx="12" />
      <path className={styles.cutLine} d="M152 217h160" />
      {/* The signed-off badge */}
      <circle className={styles.solid} cx="318" cy="104" r="20" />
      <path className={styles.cutLine} d="M308 104l8 8 15-17" />
      {/* The screwdriver beside the laptop */}
      <g transform="rotate(28 350 280)">
        <path className={styles.solid} d="M347 210l6 8h-12z" />
        <path className={styles.thin} d="M347 218v40" />
        <rect className={styles.solid} x="336" y="258" width="22" height="52" rx="10" />
      </g>
    </Sketch>
  );
}
