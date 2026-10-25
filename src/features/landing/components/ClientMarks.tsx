import type { ReactElement } from "react";
import styles from "./ClientMarks.module.css";

// Original placeholder marks for the client strip, one per business — each
// designed by a separate researcher/designer pass against the brand's industry
// conventions, then unified to one ink (currentColor) so the section controls
// the colour. The clients are real businesses that have not supplied logos yet
// — these stand in until they do (tracked in fenzit-meta deferred-work.md).

export type ClientSlug =
  | "surya-college"
  | "raj-electronics"
  | "crown-international"
  | "surya-international-school"
  | "master-mind"
  | "pearl"
  | "aircool"
  | "fem-pharma"
  | "zuba-spirits";

const MARKS: Record<ClientSlug, ReactElement> = {
  // "Dawn between the pages" — a thick half-sun rising out of an open book's spine.
  "surya-college": (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15.5 28.5 A8.5 8.5 0 0 1 32.5 28.5" strokeWidth={4.5} />
      <path d="M24 14.5 L24 9.5 M31 16.4 L33.5 12.1 M17 16.4 L14.5 12.1 M35.5 20.5 L39.6 17.6 M12.5 20.5 L8.4 17.6" />
      <path d="M15.5 28.5 C13.5 25.5 10.5 24 7.5 24 L7.5 33 C12 31.6 18 32.8 24 38 M32.5 28.5 C34.5 25.5 37.5 24 40.5 24 L40.5 33 C36 31.6 30 32.8 24 38" />
    </svg>
  ),
  // "Sovereign signal" — a crown drawn as a square waveform with circuit-node jewels.
  "raj-electronics": (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 38 V22 H14 V29 H19 V10 H29 V29 H34 V22 H40 V38 Z" />
      <circle cx="11" cy="22" r="2" fill="currentColor" stroke="none" />
      <circle cx="24" cy="10" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="37" cy="22" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  // "Meridian crown orbit" — a globe whose crown line is the crown, orbited by a satellite.
  "crown-international": (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="24" cy="21.5" r="11" />
      <path d="M13 21.5 L17 13 L20.5 18.5 L24 10.5 L27.5 18.5 L31 13 L35 21.5" />
      <path d="M13 21.5 H35" />
      <path d="M19.5 21.5 A4.5 11 0 0 0 28.5 21.5" />
      <path d="M9 27 A16 16 0 0 0 39 27" />
      <circle cx="39" cy="27" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  // "Diya sapling" — a lamp of learning whose flame is a two-leaf sprout.
  "surya-international-school": (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(-2.4 -2.5) scale(1.1)">
        <path d="M10 31 C11.5 36.5 16.5 40 24 40 C31.5 40 36.5 36.5 38 31" />
        <path d="M10 31 Q24 33.5 38 31" />
        <path d="M14.5 34.5 Q24 36.75 33.5 34.5" />
        <path d="M24 31.5 L24 20" />
        <path
          d="M24 20 C19 20.8 15.4 16.9 14.5 10.5 C21 12.6 23.7 15.9 24 20 Z"
          fill="currentColor"
          stroke="none"
        />
        <path
          d="M24 20 C29 20.8 32.6 16.9 33.5 10.5 C27 12.6 24.3 15.9 24 20 Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  ),
  // "The aimed mind" — the cranium doubles as a target ring the arrow rises into.
  "master-mind": (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="21" cy="20" r="12" />
      <circle cx="21" cy="20" r="6.5" />
      <circle cx="21" cy="20" r="2.25" fill="currentColor" stroke="none" />
      <path d="M28.7 10.8 C31.6 12.3 32.7 15.1 32.4 17.9 C33.8 18.7 36.6 20 36.9 21.7 C37.05 22.9 35.2 23.1 33.9 23.7 C34.7 25.9 33.5 27.6 30.8 26.9" />
      <path d="M21 41 L21 24.2 M17.6 27.6 L21 24.2 L24.4 27.6 M17.9 43.9 L21 41 L24.1 43.9" />
    </svg>
  ),
  // "Pearl in bloom" — a thick shell-lotus crescent cradling a solid pearl.
  pearl: (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8.5 22.5 C9.5 33.5 15.5 40.5 24 40.5 C32.5 40.5 38.5 33.5 39.5 22.5 C34.5 25.5 29 27.5 24 27.5 C19 27.5 13.5 25.5 8.5 22.5 Z"
        strokeWidth={4.5}
      />
      <path d="M8.5 22.5 C10 14.5 15 9 22 7" />
      <path d="M39.5 22.5 C38 14.5 33 9 26 7" />
      <circle cx="24" cy="19" r="5.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  // "Snow rotor" — three dendrite snowflake arms alternating with three swept fan blades.
  aircool: (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="24" cy="24" r="3" />
      <g>
        <path d="M24 9v10.5M21.5 13l2.5 2.5 2.5-2.5" />
      </g>
      <g transform="rotate(120 24 24)">
        <path d="M24 9v10.5M21.5 13l2.5 2.5 2.5-2.5" />
      </g>
      <g transform="rotate(240 24 24)">
        <path d="M24 9v10.5M21.5 13l2.5 2.5 2.5-2.5" />
      </g>
      <g transform="rotate(-30 24 24)">
        <path d="M28.5 24h4.5c2.5-.5 4-3 3.5-6.5" />
      </g>
      <g transform="rotate(90 24 24)">
        <path d="M28.5 24h4.5c2.5-.5 4-3 3.5-6.5" />
      </g>
      <g transform="rotate(210 24 24)">
        <path d="M28.5 24h4.5c2.5-.5 4-3 3.5-6.5" />
      </g>
    </svg>
  ),
  // "Capsule bloom" — five capsule petals around a seed dot: flower and dose in one.
  "fem-pharma": (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="24" cy="24" r="3.75" fill="currentColor" stroke="none" />
      <rect x="21" y="5.5" width="6" height="9.5" rx="3" />
      <g transform="rotate(72 24 24)">
        <rect x="21" y="5.5" width="6" height="9.5" rx="3" />
      </g>
      <g transform="rotate(144 24 24)">
        <rect x="21" y="5.5" width="6" height="9.5" rx="3" />
      </g>
      <g transform="rotate(216 24 24)">
        <rect x="21" y="5.5" width="6" height="9.5" rx="3" />
      </g>
      <g transform="rotate(288 24 24)">
        <rect x="21" y="5.5" width="6" height="9.5" rx="3" />
      </g>
    </svg>
  ),
  // "Z of the Arabian Sea" — an art-deco decanter holding a setting sun over a Z-shaped sea.
  "zuba-spirits": (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.75 9 L20.75 17 C20.75 21 10 21 10 24.5 L10 37 A3.5 3.5 0 0 0 13.5 40.5 L34.5 40.5 A3.5 3.5 0 0 0 38 37 L38 24.5 C38 21 27.25 21 27.25 17 L27.25 9" />
      <path d="M17.5 31 A6.5 6.5 0 0 1 30.5 31" />
      <path d="M16 31 L32 31 L16 36 L32 36" />
      <circle cx="24" cy="7" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  ),
};

export function ClientMark({ slug }: { slug: ClientSlug }) {
  return MARKS[slug];
}
