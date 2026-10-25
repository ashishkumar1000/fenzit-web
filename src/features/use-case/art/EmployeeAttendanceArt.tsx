import type { ReactNode } from "react";
import styles from "./EmployeeAttendanceArt.module.css";

/**
 * Hand-drawn scene for the use-case pages, in one colour: the primary blue, drawn as lines on a
 * pale tint, with a turbulence filter for the hand-drawn wobble (the house style of NotFoundArt).
 * Each scene carries no information, so screen readers skip it. Colours come from the design
 * tokens (see EmployeeAttendanceArt.module.css). Filter ids are unique per scene: several scenes
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

/** Employee attendance: the check-in lives on every employee's phone, under the office clock. */
export function EmployeeAttendanceArt() {
  return (
    <Sketch id="use-case-art-emp-attendance">
      {/* Ground shadow */}
      <path className={styles.tint} d="M96 336q84-16 168-4t92 2q-72 20-146 14t-114-12z" />
      {/* The office clock */}
      <circle className={styles.tint} cx="344" cy="84" r="34" />
      <path className={styles.thin} d="M344 84V62M344 84l17 9" />
      <circle className={styles.solid} cx="344" cy="84" r="4" />
      {/* The owner's phone with the check-in */}
      <rect className={styles.tint} x="148" y="76" width="124" height="232" rx="22" />
      <path className={styles.thin} d="M192 92h36" />
      <text className={styles.textSmall} x="210" y="136">
        9:02 AM
      </text>
      <circle className={styles.solid} cx="210" cy="196" r="42" />
      <path className={styles.cutLine} d="M191 196l13 13 25-27" />
      <path className={styles.thin} d="M182 262h56" />
      {/* Two more phones: one checked in, one still to check in */}
      <rect className={styles.tint} x="56" y="136" width="74" height="148" rx="14" />
      <path className={styles.thin} d="M74 166h38M74 190h26" />
      <circle className={styles.solid} cx="93" cy="232" r="13" />
      <path className={styles.cutLine} d="M87 232l5 5 9-10" />
      <rect className={styles.tint} x="296" y="158" width="74" height="148" rx="14" />
      <path className={styles.thin} d="M314 188h38M314 212h26" />
      <circle className={styles.thin} cx="333" cy="254" r="12" />
    </Sketch>
  );
}
