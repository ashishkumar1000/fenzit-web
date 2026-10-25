import type { ReactElement } from "react";
import styles from "./AudienceArt.module.css";

// Hand-drawn marks for the two audience cards, drawn in-house from researched
// motif conventions (clipboard+chart for the owner's desk, check-in phone for
// the field employee). Same single ink as the client marks: currentColor, so
// the card's tinted tile controls the colour.

export function OwnerArt(): ReactElement {
  return (
    <svg
      className={styles.mark}
      viewBox="9.5 5.375 29 38.125"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* "The command board" — a clipboard of ticked jobs over a mini report chart.
          The viewBox is cropped to the glyph so the drawn edge hugs the card's
          tick column when the mark is left-aligned in its slot. */}
      <rect x="11.5" y="8.5" width="25" height="33" rx="3" />
      <rect x="19.5" y="6" width="9" height="5" rx="1.75" fill="currentColor" stroke="none" />
      <path d="M16 17.5 L18.4 19.9 L22.6 15.1 M26.5 18 H32" />
      <path d="M16 25 L18.4 27.4 L22.6 22.6 M26.5 25.5 H32" />
      <path d="M16.5 36.5 V33.5 M22.5 36.5 V30.5 M28.5 36.5 V32" />
    </svg>
  );
}

export function EmployeeArt(): ReactElement {
  return (
    <svg
      className={styles.mark}
      viewBox="13 5.5 22 35"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* "Check-in from the field" — the phone screen holds a pin and a done-check.
          Cropped viewBox, left-hugging like the owner mark. */}
      <rect x="15" y="7.5" width="18" height="31" rx="3" />
      <path d="M24 13.5 C21.1 13.5 19.1 15.5 19.1 18 C19.1 21.2 24 24.7 24 24.7 C24 24.7 28.9 21.2 28.9 18 C28.9 15.5 26.9 13.5 24 13.5 Z" />
      <circle cx="24" cy="18" r="1.7" fill="currentColor" stroke="none" />
      <path d="M20.5 30 L22.9 32.4 L27.5 27.4" />
    </svg>
  );
}
