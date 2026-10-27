import type { BadgeTone } from "../status";
import { humanize, toneForStatus } from "../status";
import styles from "./Badge.module.css";

export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {label}
    </span>
  );
}

/** A status badge from a raw wire value: picks the tone and the words. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge label={humanize(status)} tone={toneForStatus(status)} />;
}
