import type { ReactNode } from "react";
import type { BadgeTone } from "../status";
import { humanize, toneForStatus } from "../status";
import styles from "./Badge.module.css";

export function Badge({
  label,
  tone,
  dot = false,
  icon,
  className,
}: {
  label: string;
  tone: BadgeTone;
  /** A leading status dot in the badge's own tone (never the only signal). */
  dot?: boolean;
  /** A leading icon in the badge's own tone (always paired with the words). */
  icon?: ReactNode;
  /** Extra classes from the calling component's module (shape, size). */
  className?: string;
}) {
  return (
    <span
      className={`${styles.badge}${className === undefined ? "" : ` ${className}`}`}
      data-tone={tone}
    >
      {icon !== undefined ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

/** A status badge from a raw wire value: picks the tone and the words. */
export function StatusBadge({
  status,
  dot = false,
  className,
}: {
  status: string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <Badge label={humanize(status)} tone={toneForStatus(status)} dot={dot} className={className} />
  );
}
