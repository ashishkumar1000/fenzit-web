import styles from "./AdminArt.module.css";

/**
 * A small, light-hearted scene for the admin page, in one colour: a laptop with a smiling
 * screen, a crown on top (the boss), and a mug of coffee. It carries no information, so
 * screen readers skip it. Colours come from the design tokens (see AdminArt.module.css).
 */
export function AdminArt() {
  return (
    <svg className={styles.art} viewBox="0 0 440 320" aria-hidden="true" focusable="false">
      <defs>
        <filter id="admin-art-sketch" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="4" />
        </filter>
      </defs>

      <g filter="url(#admin-art-sketch)">
        {/* Sparkles */}
        <path className={styles.thin} d="M66 62v16M58 70h16" />
        <path className={styles.thin} d="M368 52v14M361 59h14" />

        {/* Laptop */}
        <rect className={styles.tint} x="110" y="70" width="200" height="130" rx="12" />
        <path className={styles.solid} d="M78 214h264l-14 24H92z" />

        {/* Smiling screen */}
        <circle className={styles.solid} cx="186" cy="122" r="5" />
        <circle className={styles.solid} cx="224" cy="122" r="5" />
        <path className={styles.thin} d="M186 146q19 18 38 0" />

        {/* Crown */}
        <path className={styles.solid} d="M172 70l6-24 14 14 18-22 18 22 14-14 6 24z" />

        {/* Mug of coffee */}
        <rect className={styles.solid} x="318" y="176" width="54" height="50" rx="8" />
        <path className={styles.thin} d="M372 190q18 0 0 26" />
        <path className={styles.thin} d="M330 162q-8-10 0-20t0-20M350 158q-8-10 0-20" />
      </g>
    </svg>
  );
}
