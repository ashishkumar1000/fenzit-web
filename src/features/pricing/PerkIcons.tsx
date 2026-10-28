// Custom outline icons for the four perks in the pricing hero. They use the same 24px grid,
// 2px stroke and round ends as the lucide icons, and take their colour from the text colour.
import styles from "./PerkIcons.module.css";

type PerkIconProps = {
  className?: string;
};

// Joins the icon's own class with any class the caller passes in.
function iconClass(className: string | undefined): string {
  return className ? `${styles.icon} ${className}` : styles.icon;
}

const SVG_PROPS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** A card with a slash through it: no card needed. */
export function NoCardIcon({ className }: PerkIconProps) {
  return (
    <svg className={iconClass(className)} {...SVG_PROPS}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

/** A shield with a tick: full access for the whole trial. */
export function ShieldIcon({ className }: PerkIconProps) {
  return (
    <svg className={iconClass(className)} {...SVG_PROPS}>
      <path d="M12 3 20 6v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6z" />
      <path d="m8.5 12 2.5 2.5 4.5-4.5" />
    </svg>
  );
}

/** Two arrows pointing opposite ways: leave at any time. */
export function CancelIcon({ className }: PerkIconProps) {
  return (
    <svg className={iconClass(className)} {...SVG_PROPS}>
      <path d="M10 12H4" />
      <path d="M7 9l-3 3 3 3" />
      <path d="M14 12h6" />
      <path d="M17 9l3 3-3 3" />
    </svg>
  );
}

/** A headset with a mic: a call with our engineer. */
export function HeadsetIcon({ className }: PerkIconProps) {
  return (
    <svg className={iconClass(className)} {...SVG_PROPS}>
      <path d="M4 12a8 8 0 0 1 16 0" />
      <rect x="3" y="11" width="4" height="7" rx="2" />
      <rect x="17" y="11" width="4" height="7" rx="2" />
      <path d="M17 18a2 2 0 0 1-2 2h-2" />
      <rect x="9" y="19" width="4" height="2" rx="1" />
    </svg>
  );
}
