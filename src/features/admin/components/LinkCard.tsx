import type { ReactNode } from "react";
import { Link } from "react-router";
import styles from "./LinkCard.module.css";

type LinkCardProps = {
  to: string;
  label: string;
  note: string;
  /** A live count when the overview knows one; otherwise a plain "View all". */
  count?: number;
  art: ReactNode;
};

/**
 * An overview tile that links to a full-list page. The artwork sits behind
 * the text as a soft background; the whole card is the link.
 */
export function LinkCard({ to, label, note, count, art }: LinkCardProps) {
  return (
    <Link to={to} className={styles.card}>
      <span className={styles.art} aria-hidden="true">
        {art}
      </span>
      <span className={styles.body}>
        <span className={styles.label}>{label}</span>
        <span className={styles.note}>{note}</span>
        <span className={styles.count}>{count === undefined ? "View all" : `${count} total`}</span>
      </span>
    </Link>
  );
}
