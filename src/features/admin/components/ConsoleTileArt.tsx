// Hand-authored decorative art for the console stat tiles (2026-11-14).
// Colours come from the design-system tokens (src/styles/tokens.css): each
// variant owns one family — total/approval use the primary tokens, active the
// done tokens, invites the scheduled tokens — so dark mode follows the theme.
// Every variant shares one composition — layered organic blobs with translucent
// gradient fills, a faint ring or dot accent, and one small abstract motif —
// and each variant hints at its meaning without illustrating it. All shapes
// stay at 0.10–0.45 opacity so the art sits behind the tile's text, never
// over it. Coordinates are original (no copied path data).

import type { ReactNode } from "react";
import styles from "./ConsoleTileArt.module.css";

export type ConsoleTileArtVariant = "total" | "active" | "invites" | "approval";

type Composition = {
  /** Gradient stops, per family: strong colour → soft partner. */
  gradientId: string;
  from: string;
  to: string;
  shapes: ReactNode;
};

const COMPOSITIONS: Record<ConsoleTileArtVariant, Composition> = {
  // TOTAL EMPLOYEES — two blue blobs filling the bottom-right corner, a
  // faint ring floating above them, and a soft overlapping head-and-shoulders
  // silhouette rising from the blob: a person hinted at, not drawn.
  total: {
    gradientId: "consoleTileArtTotalGrad",
    from: "var(--color-primary)",
    to: "var(--color-primary-soft)",
    shapes: (
      <>
        <path
          d="M 132 120 C 128 86 150 62 178 60 C 205 58 224 78 224 108 L 224 120 Z"
          fill="url(#consoleTileArtTotalGrad)"
          opacity="0.35"
        />
        <path
          d="M 168 22 C 186 12 210 22 212 40 C 214 58 198 70 182 66 C 166 62 152 30 168 22 Z"
          fill="var(--color-primary)"
          opacity="0.16"
        />
        <circle
          cx="196"
          cy="36"
          r="25"
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity="0.18"
          strokeWidth="2"
        />
        {/* Motif: soft overlapping person — head circle + shoulders arc. */}
        <circle cx="186" cy="80" r="10" fill="var(--color-primary)" opacity="0.28" />
        <path
          d="M 164 120 C 164 100 174 90 186 90 C 198 90 208 100 208 120 Z"
          fill="var(--color-primary)"
          opacity="0.2"
        />
      </>
    ),
  },

  // ACTIVE STATUS — one emerald blob anchoring the corner and a rising arc
  // sweeping up past a small glowing tip: progress moving up and to the right.
  active: {
    gradientId: "consoleTileArtActiveGrad",
    from: "var(--color-status-done-solid)",
    to: "var(--color-status-done-bg)",
    shapes: (
      <>
        <path
          d="M 142 120 C 142 94 160 76 186 74 C 210 72 224 90 224 118 L 224 120 Z"
          fill="url(#consoleTileArtActiveGrad)"
          opacity="0.32"
        />
        {/* Motif: rising arc with a soft echo underneath. */}
        <path
          d="M 128 104 C 150 100 172 84 186 58"
          fill="none"
          stroke="var(--color-status-done-solid)"
          strokeOpacity="0.35"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M 140 112 C 162 108 182 94 196 72"
          fill="none"
          stroke="var(--color-status-done-solid)"
          strokeOpacity="0.14"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="188" cy="54" r="5" fill="var(--color-status-done-solid)" opacity="0.3" />
        <circle
          cx="222"
          cy="44"
          r="12"
          fill="none"
          stroke="var(--color-status-done-solid)"
          strokeOpacity="0.14"
          strokeWidth="2"
        />
      </>
    ),
  },

  // INVITES — amber blob and floating dots, with a gently tilted rounded
  // rectangle carrying a fold line: an envelope resting in the corner.
  invites: {
    gradientId: "consoleTileArtInvitesGrad",
    from: "var(--color-status-scheduled-solid)",
    to: "var(--color-status-scheduled-bg)",
    shapes: (
      <>
        <path
          d="M 136 120 C 134 96 152 80 178 80 C 202 80 224 94 224 118 L 224 120 Z"
          fill="url(#consoleTileArtInvitesGrad)"
          opacity="0.3"
        />
        {/* Motif: envelope-ish rounded card with a fold hint. */}
        <g transform="rotate(-6 179 79)">
          <rect
            x="150"
            y="58"
            width="58"
            height="42"
            rx="8"
            fill="url(#consoleTileArtInvitesGrad)"
            opacity="0.28"
          />
          <path
            d="M 154 63 L 179 82 L 204 63"
            fill="none"
            stroke="var(--color-status-scheduled-solid)"
            strokeOpacity="0.3"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <circle cx="146" cy="46" r="6" fill="var(--color-status-scheduled-solid)" opacity="0.18" />
        <circle
          cx="210"
          cy="44"
          r="12"
          fill="none"
          stroke="var(--color-status-scheduled-solid)"
          strokeOpacity="0.15"
          strokeWidth="2"
        />
      </>
    ),
  },

  // APPROVAL — violet blob with a soft badge disc, a rounded tick drawn
  // through it, and a small dot: a checkmark suggested, not stamped.
  approval: {
    gradientId: "consoleTileArtApprovalGrad",
    from: "var(--color-primary)",
    to: "var(--color-primary-soft)",
    shapes: (
      <>
        <path
          d="M 140 120 C 140 96 158 78 184 78 C 208 78 224 94 224 118 L 224 120 Z"
          fill="url(#consoleTileArtApprovalGrad)"
          opacity="0.3"
        />
        <circle cx="182" cy="74" r="32" fill="url(#consoleTileArtApprovalGrad)" opacity="0.25" />
        {/* Motif: rounded tick. */}
        <path
          d="M 168 74 C 172 78 176 84 180 88 C 188 76 198 66 208 58"
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity="0.4"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="214" cy="40" r="4" fill="var(--color-primary)" opacity="0.2" />
        <circle
          cx="142"
          cy="108"
          r="11"
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity="0.14"
          strokeWidth="2"
        />
      </>
    ),
  },
};

/** Decorative background art layer for a console stat tile. Renders an
 *  absolutely-positioned span (styled by ConsoleTileArt.module.css) holding a
 *  corner-anchored SVG; the parent tile clips and sizes it. Hidden from
 *  assistive tech and untouched by the pointer. */
export function ConsoleTileArt({ variant }: { variant: ConsoleTileArtVariant }) {
  const { gradientId, from, to, shapes } = COMPOSITIONS[variant];
  return (
    <span className={styles.art} aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 220 120"
        preserveAspectRatio="xMaxYMax slice"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        {shapes}
      </svg>
    </span>
  );
}
