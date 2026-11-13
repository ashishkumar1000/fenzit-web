import styles from "./LiveVersionStrip.module.css";

interface LiveVersionStripProps {
  /** Live on Google Play. null: the server could not check. undefined: the server does not send it yet. */
  live: string | null | undefined;
}

/**
 * A strip at the top of the Force update section: the Android version users can
 * install right now. Read-only. Shows why it is missing when it cannot be read.
 */
export function LiveVersionStrip({ live }: LiveVersionStripProps) {
  return (
    <p className={styles.strip} role="status">
      <span className={styles.chip}>Android</span>
      {typeof live === "string" && live !== "" ? (
        <>
          <span className={styles.label}>Live on Google Play</span>{" "}
          <span className={styles.version}>{live}</span>
        </>
      ) : live === null ? (
        <span className={styles.muted}>
          Could not check the live version on Google Play right now. Try again in a minute.
        </span>
      ) : (
        <span className={styles.muted}>The live version is not shown yet.</span>
      )}
    </p>
  );
}
