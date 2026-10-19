import styles from "./PulseDot.module.css";

/** A small pulsing green dot that signals something is live. Decorative only. */
export function PulseDot() {
  return <span className={styles.pulse} aria-hidden="true" />;
}
