import styles from "./CustomersArt.module.css";

/**
 * Decorative scene for the customers page: an abstract storefront with a scalloped awning
 * draped over a shopfront arch, a round window glowing softly, and a warm heart with a couple
 * of floating dots around it. Everything sits in the right half of the frame so text can rest
 * on the quiet left. It carries no information, so screen readers skip it. Colours come from
 * the design tokens (see CustomersArt.module.css).
 */
export function CustomersArt() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 320 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* Soft disc that gathers the scene */}
      <circle className={styles.disc} cx="242" cy="96" r="68" />

      {/* Ground shadow under the shop */}
      <ellipse className={styles.ground} cx="242" cy="152" rx="62" ry="5" />

      {/* Shopfront arch */}
      <path className={styles.storefront} d="M200 148v-45a42 42 0 0 1 84 0v45z" />

      {/* Doorway */}
      <path className={styles.door} d="M226 148v-26a16 16 0 0 1 32 0v26z" />

      {/* Round window, lit like an open sign */}
      <circle className={styles.window} cx="242" cy="90" r="8" />

      {/* Scalloped awning draped over the arch */}
      <path
        className={styles.awning}
        d="M190 52h104v12a13 13 0 0 1-26 0a13 13 0 0 1-26 0a13 13 0 0 1-26 0a13 13 0 0 1-26 0z"
      />

      {/* Heart floating beside the shop */}
      <path
        className={styles.heart}
        d="M276 58c-6-5-9-9-9-12.5a4.5 4.5 0 0 1 9-1a4.5 4.5 0 0 1 9 1c0 3.5-3 7.5-9 12.5z"
      />

      {/* Floating dots */}
      <circle className={styles.dotA} cx="184" cy="30" r="5" />
      <circle className={styles.dotB} cx="306" cy="124" r="4" />
    </svg>
  );
}
