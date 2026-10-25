import type { ReactNode } from "react";
import styles from "./TechnicianTrackingArt.module.css";

/**
 * The technician scene, in one colour: the primary blue, drawn as lines on a pale tint, with a
 * turbulence filter for the hand-drawn wobble (the house style of NotFoundArt). The scene carries
 * no information, so screen readers skip it. Colours come from the design tokens (see
 * TechnicianTrackingArt.module.css). The filter id is unique to this scene: several scenes could
 * end up in one document through cross-links rendered as prerendered pages.
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

/** Technicians: the open toolbox with the wrench, today's job card with its ticked steps, and the pin at the site. */
export function TechnicianTrackingArt() {
  return (
    <Sketch id="use-case-art-technician">
      <GroundShadow />
      {/* The open lid, tipped back */}
      <rect
        className={styles.tint}
        x="86"
        y="128"
        width="124"
        height="26"
        rx="8"
        transform="rotate(22 148 150)"
      />
      {/* The toolbox */}
      <rect className={styles.tint} x="76" y="188" width="150" height="102" rx="10" />
      <path className={styles.thin} d="M76 210h150" />
      <rect className={styles.solid} x="140" y="204" width="22" height="14" rx="5" />
      <path className={styles.thin} d="M96 268h110" />
      {/* The wrench standing in the box */}
      <g transform="rotate(32 236 140)">
        <circle className={styles.solid} cx="236" cy="98" r="24" />
        <circle className={styles.cut} cx="236" cy="98" r="11" />
        <rect className={styles.solid} x="228" y="116" width="16" height="96" rx="8" />
      </g>
      {/* Today's job card with three ticked steps */}
      <rect className={styles.tint} x="258" y="134" width="116" height="170" rx="10" />
      <text className={styles.textSmall} x="316" y="164">
        Today
      </text>
      <path className={styles.thin} d="M276 176h80" />
      <circle className={styles.solid} cx="286" cy="204" r="11" />
      <path className={styles.cutLine} d="M280 204l5 5 9-11" />
      <path className={styles.thin} d="M306 204h52" />
      <circle className={styles.solid} cx="286" cy="240" r="11" />
      <path className={styles.cutLine} d="M280 240l5 5 9-11" />
      <path className={styles.thin} d="M306 240h60" />
      <circle className={styles.solid} cx="286" cy="276" r="11" />
      <path className={styles.cutLine} d="M280 276l5 5 9-11" />
      <path className={styles.thin} d="M306 276h44" />
      {/* The job at the site */}
      <path className={styles.dashed} d="M312 128q16-24 34-14" />
      <path className={styles.solid} d="M346 104c-14-16-14-34 0-34 14 0 14 18 0 34z" />
      <circle className={styles.cut} cx="346" cy="80" r="6" />
    </Sketch>
  );
}
