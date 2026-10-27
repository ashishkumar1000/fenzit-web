import styles from "./TeamArt.module.css";

export function TeamArt() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 320 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* Soft halo anchoring the cluster on the right half of the card. */}
      <circle className={styles.halo} cx="232" cy="92" r="62" />

      {/* Bodies, back to front, so nearer figures layer on top. */}
      <path className={styles.bodyBack} d="M196 160v-45a45 45 0 0 1 90 0v45Z" />
      <path className={styles.bodyMid} d="M158 160v-36a35 35 0 0 1 70 0v36Z" />
      <path className={styles.bodyDone} d="M238 160v-32a32 32 0 0 1 64 0v32Z" />
      <path className={styles.bodyAmber} d="M172 160v-26a26 26 0 0 1 52 0v26Z" />

      {/* Heads, same back-to-front order, each tucked slightly into its dome. */}
      <circle className={styles.headBack} cx="241" cy="58" r="17" />
      <circle className={styles.headMid} cx="193" cy="80" r="13" />
      <circle className={styles.headDone} cx="270" cy="90" r="12" />
      <circle className={styles.headAmber} cx="198" cy="102" r="10" />

      {/* A few quiet accents drifting above the cluster. */}
      <circle className={styles.doneDot} cx="170" cy="44" r="4" />
      <circle className={styles.accentDot} cx="224" cy="34" r="3.5" />
      <path className={styles.sparkle} d="M302 41q1 4 5 5q-4 1-5 5q-1-4-5-5q4-1 5-5Z" />
    </svg>
  );
}
