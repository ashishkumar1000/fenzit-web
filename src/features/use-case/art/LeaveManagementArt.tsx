import type { ReactNode } from "react";
import styles from "./LeaveManagementArt.module.css";

/**
 * The hand-drawn scene for the leave-management page, in one colour: the primary blue, drawn as
 * lines on a pale tint, with a turbulence filter for the hand-drawn wobble (the house style of
 * NotFoundArt). The scene carries no information, so screen readers skip it. Colours come from
 * the design tokens (see LeaveManagementArt.module.css). The filter id is unique to this scene:
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

/** Leave next to attendance: the month with the approved day, the request card, and the phone. */
export function LeaveManagementArt() {
  return (
    <Sketch id="use-case-art-leave">
      <GroundShadow />
      {/* The month, with the approved day marked */}
      <rect className={styles.tint} x="48" y="64" width="196" height="164" rx="12" />
      <rect className={styles.solid} x="84" y="52" width="10" height="24" rx="5" />
      <rect className={styles.solid} x="198" y="52" width="10" height="24" rx="5" />
      <path className={styles.thin} d="M48 102h196" />
      <circle className={styles.thin} cx="74" cy="126" r="8" />
      <circle className={styles.thin} cx="112" cy="126" r="8" />
      <circle className={styles.thin} cx="150" cy="126" r="8" />
      <circle className={styles.thin} cx="188" cy="126" r="8" />
      <circle className={styles.thin} cx="74" cy="162" r="8" />
      <circle className={styles.thin} cx="112" cy="162" r="8" />
      <circle className={styles.solid} cx="150" cy="162" r="12" />
      <path className={styles.cutLine} d="M143 162l5 5 10-11" />
      <circle className={styles.thin} cx="188" cy="162" r="8" />
      <circle className={styles.thin} cx="74" cy="198" r="8" />
      <circle className={styles.thin} cx="112" cy="198" r="8" />
      <circle className={styles.thin} cx="150" cy="198" r="8" />
      {/* The leave request, approved */}
      <rect className={styles.tint} x="92" y="248" width="180" height="62" rx="10" />
      <circle className={styles.solid} cx="122" cy="279" r="15" />
      <path className={styles.cutLine} d="M115 279l6 6 11-13" />
      <path className={styles.thin} d="M150 270h92" />
      <path className={styles.thin} d="M150 288h64" />
      {/* The owner's phone, with the approval */}
      <rect className={styles.tint} x="296" y="120" width="88" height="180" rx="16" />
      <path className={styles.thin} d="M328 140h24" />
      <circle className={styles.solid} cx="340" cy="196" r="17" />
      <path className={styles.cutLine} d="M331 196l6 6 13-15" />
      <path className={styles.thin} d="M326 282h28" />
    </Sketch>
  );
}
