// The console's own hand-drawn icons: 24px grid, 2px stroke, round caps and
// joins, drawn for the fenzit-web console palette. Drawn by hand (2026-11-14)
// so the console does not depend on an icon package for its accent glyphs.
import styles from "./consoleIcons.module.css";

export interface ConsoleIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const svgProps = (size: number, strokeWidth: number, className?: string) =>
  ({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    width: size,
    height: size,
    className: className ? `${styles.icon} ${className}` : styles.icon,
    "aria-hidden": true,
  }) as const;

export function UsersIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <circle cx="10" cy="7.5" r="3.5" />
      <path d="M3.5 20.6v-.3a6.5 6.5 0 0 1 13 0v.3" />
      <circle cx="17.3" cy="7" r="3" />
      <path d="M16.6 14.4a6.3 6.3 0 0 1 4.9 5.9v.3" />
    </svg>
  );
}

export function UserCheckIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M3 20.6v-.3a6.5 6.5 0 0 1 13 0v.3" />
      <path d="M15.6 11.6l2.2 2.2 4-4" />
    </svg>
  );
}

export function BellIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <path d="M17.8 9.5a5.8 5.8 0 0 0-11.6 0c0 6-2.7 8-2.7 8h17s-2.7-2-2.7-8z" />
      <path d="M10.3 21.3a2.4 2.4 0 0 0 3.4 0" />
    </svg>
  );
}

export function ClipboardListIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="2.5" width="6" height="3.5" rx="1.2" />
      <path d="M8.5 10.5h7" />
      <path d="M8.5 14h7" />
      <path d="M8.5 17.5h4" />
    </svg>
  );
}

export function CrownIcon({ size = 24, className }: ConsoleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path d="M5.1 19.4 3.05 7.9a.7.7 0 0 1 1.08-.71L8.4 10.2l2.9-5.15a.8.8 0 0 1 1.4 0l2.9 5.15 4.27-3.01a.7.7 0 0 1 1.08.71L18.9 19.4a1.6 1.6 0 0 1-1.58 1.35H6.68A1.6 1.6 0 0 1 5.1 19.4Z" />
    </svg>
  );
}

export function UserIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <circle cx="12" cy="7.5" r="4" />
      <path d="M4.5 21v-.3a7.5 7.5 0 0 1 15 0v.3" />
    </svg>
  );
}

export function PowerIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <path d="M12 3.5v6.5" />
      <path d="M17.9 6.3a8 8 0 1 1-11.8 0" />
    </svg>
  );
}

export function ApprovalTagIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <path d="M13 3H4a1 1 0 0 0-1 1v9l7.7 7.7a2.2 2.2 0 0 0 2.6-3.4l7-7Z" />
      <circle cx="7.4" cy="7.4" r="1.4" />
      <path d="M9 12.4l2.2 2.2 4.4-4.4" />
    </svg>
  );
}

export function ZapIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <path d="M12.9 3 4.9 13.2h5.6l1 7.8 8-10.2h-5.6l-1-7.8Z" />
    </svg>
  );
}

export function EditIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <path d="M11 3.5H5.7a2.2 2.2 0 0 0-2.2 2.2v12.6a2.2 2.2 0 0 0 2.2 2.2h12.6a2.2 2.2 0 0 0 2.2-2.2V13" />
      <path d="M9 15 16.2 5.2 18.8 7.8 10.3 16.3Z" />
      <path d="M13.7 7.8l2.5 2.5" />
    </svg>
  );
}

export function SearchIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20.4 20.4 16 16" />
    </svg>
  );
}

export function DownloadIcon({ size = 24, strokeWidth = 2, className }: ConsoleIconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, className)}>
      <path d="M20.5 15.5v1.7a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-1.7" />
      <path d="M12 4v10.8" />
      <path d="M7.6 10.4l4.4 4.4 4.4-4.4" />
    </svg>
  );
}
