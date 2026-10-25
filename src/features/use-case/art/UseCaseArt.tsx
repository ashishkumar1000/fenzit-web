import type { ReactNode } from "react";
import styles from "./UseCaseArt.module.css";

/**
 * Hand-drawn scenes for the use-case pages, in one colour: the primary blue, drawn as lines on a
 * pale tint, with a turbulence filter for the hand-drawn wobble (the house style of NotFoundArt).
 * Each scene carries no information, so screen readers skip it. Colours come from the design
 * tokens (see UseCaseArt.module.css). Filter ids are unique per scene: several scenes could end
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

function Pin({ x, y }: { x: number; y: number }) {
  return (
    <>
      <path className={styles.solid} d={`M${x} ${y}c-14-16-14-34 0-34 14 0 14 18 0 34z`} />
      <circle className={styles.cut} cx={x} cy={y - 24} r="6" />
    </>
  );
}

/** The USP pillar: a job card with its steps, and the route to the customer. */
export function JobTrackingArt() {
  return (
    <Sketch id="use-case-art-jobs">
      <GroundShadow />
      {/* Job card with three steps */}
      <rect className={styles.tint} x="84" y="66" width="180" height="240" rx="12" />
      <rect className={styles.solid} x="146" y="50" width="56" height="30" rx="9" />
      <circle className={styles.solid} cx="122" cy="122" r="14" />
      <path className={styles.cutLine} d="M115 122l6 6 11-13" />
      <path className={styles.thin} d="M150 122h78" />
      <circle className={styles.solid} cx="122" cy="176" r="10" />
      <path className={styles.thin} d="M150 176h92" />
      <circle className={styles.thin} cx="122" cy="230" r="13" />
      <path className={styles.thin} d="M150 230h64" />
      {/* The route to the customer */}
      <path className={styles.dashed} d="M120 290q90 30 224-72" />
      <rect className={styles.tint} x="296" y="182" width="72" height="58" rx="8" />
      <path className={styles.thin} d="M310 204h44M310 220h30" />
      <Pin x={332} y={158} />
    </Sketch>
  );
}

/** AC and appliance service: the unit on the wall, the airflow, the finished-job tag. */
export function AcServiceArt() {
  return (
    <Sketch id="use-case-art-ac">
      <GroundShadow />
      {/* The split unit */}
      <rect className={styles.tint} x="84" y="64" width="252" height="76" rx="12" />
      <path className={styles.thin} d="M108 88h70" />
      <circle className={styles.solid} cx="304" cy="102" r="6" />
      <path className={styles.thin} d="M108 116h204" />
      {/* Airflow */}
      <path className={styles.thin} d="M140 168q16 26 0 52" />
      <path className={styles.thin} d="M210 168q16 26 0 52" />
      <path className={styles.thin} d="M280 168q16 26 0 52" />
      {/* The service tag: job done */}
      <rect className={styles.tint} x="140" y="244" width="140" height="56" rx="8" />
      <circle className={styles.solid} cx="172" cy="272" r="15" />
      <path className={styles.cutLine} d="M165 272l6 6 11-13" />
      <text className={styles.textSmall} x="230" y="279">
        Done
      </text>
    </Sketch>
  );
}

/** Plumbers: the pipe with its flanges, a drop, and the wrench. */
export function PlumberArt() {
  return (
    <Sketch id="use-case-art-plumber">
      <GroundShadow />
      {/* The pipe run */}
      <rect className={styles.tint} x="64" y="148" width="160" height="42" rx="9" />
      <rect className={styles.tint} x="182" y="148" width="44" height="134" rx="9" />
      <rect className={styles.solid} x="54" y="140" width="18" height="58" rx="7" />
      <rect className={styles.solid} x="174" y="274" width="60" height="18" rx="7" />
      <path className={styles.thin} d="M84 169h108" />
      {/* Drops from the joint */}
      <path className={styles.tint} d="M244 296q-10 14 0 21 10-7 0-21z" />
      <path className={styles.tint} d="M276 312q-9 12 0 18 9-6 0-18z" />
      {/* The wrench */}
      <g transform="rotate(45 318 190)">
        <circle className={styles.solid} cx="318" cy="146" r="27" />
        <circle className={styles.cut} cx="318" cy="146" r="12" />
        <rect className={styles.solid} x="309" y="168" width="18" height="110" rx="9" />
      </g>
    </Sketch>
  );
}

/** Delivery: the parcel with its drop pin, and the customer's signature on the slip. */
export function DeliveryArt() {
  return (
    <Sketch id="use-case-art-delivery">
      <GroundShadow />
      {/* The parcel */}
      <rect className={styles.tint} x="110" y="140" width="156" height="134" rx="9" />
      <rect className={styles.solid} x="177" y="140" width="22" height="134" />
      <path className={styles.thin} d="M110 172h156" />
      <Pin x={188} y={116} />
      {/* The signature slip */}
      <rect
        className={styles.tint}
        x="252"
        y="226"
        width="118"
        height="72"
        rx="7"
        transform="rotate(-4 311 262)"
      />
      <path
        className={styles.thin}
        d="M272 262q11-16 21 0t21 0 21 0"
        transform="rotate(-4 311 262)"
      />
      <path className={styles.thin} d="M272 280h80" transform="rotate(-4 311 262)" />
    </Sketch>
  );
}

/** Collection and field visits: the visit card with its address pin, and the verified shield. */
export function CollectionArt() {
  return (
    <Sketch id="use-case-art-collection">
      <GroundShadow />
      {/* The visit card */}
      <rect className={styles.tint} x="92" y="88" width="190" height="118" rx="10" />
      <path className={styles.thin} d="M114 122h96" />
      <path className={styles.thin} d="M114 148h146" />
      <path className={styles.thin} d="M114 174h64" />
      <Pin x={252} y={132} />
      {/* Verified-visit shield */}
      <path className={styles.solid} d="M300 192l44 16v38c0 29-21 45-44 51-23-6-44-22-44-51v-38z" />
      <path className={styles.cutLine} d="M281 250l15 15 27-31" />
    </Sketch>
  );
}
