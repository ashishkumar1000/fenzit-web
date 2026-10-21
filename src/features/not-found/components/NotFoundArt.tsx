import styles from "./NotFoundArt.module.css";

/**
 * Decorative scene for the 404 page, in one colour: the primary blue, drawn as lines on a pale
 * blue tint. A round character looks puzzled, holds a signpost that points two ways, and wears a
 * "404" tag. It carries no information, so screen readers skip it. Colours come from the design
 * tokens (see NotFoundArt.module.css).
 */
export function NotFoundArt() {
  return (
    <svg className={styles.art} viewBox="0 0 440 360" aria-hidden="true" focusable="false">
      <defs>
        <filter id="not-found-art-sketch" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="4" />
        </filter>
      </defs>

      <g filter="url(#not-found-art-sketch)">
        {/* Question mark */}
        <path className={styles.query} d="M96 40q0-28 26-28t26 24q0 16-18 28q-12 8-12 22" />
        <circle className={styles.solid} cx="118" cy="98" r="7" />

        {/* Ground shadow */}
        <path className={styles.tint} d="M108 330q60-14 140 0t120 0q-60 16-130 14t-130-14z" />

        {/* Signpost */}
        <rect className={styles.solid} x="300" y="110" width="14" height="216" rx="5" />
        <path className={styles.tint} d="M240 84h120l16 18-16 18H240z" />
        <path className={styles.thin} d="M256 102h84" />
        <path className={styles.tint} d="M320 146h110v36H320l-16-18z" />
        <path className={styles.thin} d="M344 164h70" />

        {/* Body */}
        <path
          className={styles.tint}
          d="M96 300C70 230 88 150 160 136c76-14 132 30 134 100 2 66-22 96-82 98-66 2-96-8-116-34z"
        />

        {/* Face: puzzled */}
        <circle className={styles.solid} cx="160" cy="210" r="9" />
        <circle className={styles.solid} cx="216" cy="210" r="9" />
        <path className={styles.thin} d="M168 252q10-8 22 0" />
        <circle className={styles.tint} cx="142" cy="236" r="6" />
        <circle className={styles.tint} cx="234" cy="236" r="6" />

        {/* 404 tag */}
        <rect
          className={styles.tint}
          x="120"
          y="262"
          width="62"
          height="34"
          rx="4"
          transform="rotate(-6 151 279)"
        />
        <text className={styles.tagText} x="151" y="286" transform="rotate(-6 151 279)">
          404
        </text>

        {/* Feet */}
        <rect className={styles.solid} x="116" y="318" width="34" height="18" rx="9" />
        <rect className={styles.solid} x="188" y="318" width="34" height="18" rx="9" />

        {/* Arm holding the sign */}
        <path className={styles.arm} d="M238 232q34-8 62-6" />
        <circle className={styles.solid} cx="304" cy="226" r="11" />
      </g>
    </svg>
  );
}
