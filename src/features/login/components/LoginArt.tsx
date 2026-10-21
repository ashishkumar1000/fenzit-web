import styles from "./LoginArt.module.css";

/**
 * Decorative scene for the login page, in one colour: the primary blue, drawn as lines on a
 * pale blue tint. A field technician checks a job on a phone that shows a map and a route,
 * with a check bubble and a padlock. The sketch filter gives the lines a hand-drawn edge. It
 * carries no information, so screen readers skip it. Colours come from the design tokens
 * (see LoginArt.module.css).
 */
export function LoginArt() {
  return (
    <svg className={styles.art} viewBox="0 0 440 440" aria-hidden="true" focusable="false">
      <defs>
        <filter id="login-art-sketch" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="4" />
        </filter>
      </defs>

      <g filter="url(#login-art-sketch)">
        {/* Clouds */}
        <path
          className={styles.tint}
          d="M18 118q18-40 62-34q12-30 50-22q30 4 36 36q40 0 36 30H18z"
        />
        <path className={styles.tint} d="M300 56q24-30 60-20q30-6 40 24q30 0 26 26H300z" />
        <path className={styles.tint} d="M246 418q20-28 52-22q22-22 56-8q36 0 36 30H246z" />

        {/* Phone */}
        <rect className={styles.solid} x="128" y="84" width="190" height="330" rx="30" />
        <rect className={styles.tint} x="144" y="106" width="158" height="286" rx="18" />
        <path className={styles.thin} d="M144 214h158M226 106v286" />
        <path className={styles.route} d="M164 350q40-84 74-44t70-70" />
        <path
          className={styles.solid}
          d="M250 170c-14 0-24 10-24 23 0 18 24 42 24 42s24-24 24-42c0-13-10-23-24-23z"
        />
        <circle className={styles.tint} cx="250" cy="193" r="8" />

        {/* Check bubble */}
        <path
          className={styles.tint}
          d="M52 96q0-28 36-28h18q36 0 36 28t-36 28h-6l-14 22-4-22q-30-2-30-28z"
        />
        <path className={styles.tick} d="M70 92l12 12 22-26" />

        {/* Lock */}
        <path className={styles.shackle} d="M322 226v-24a22 22 0 0 1 44 0v24" />
        <rect className={styles.solid} x="304" y="222" width="80" height="72" rx="12" />
        <circle className={styles.tint} cx="344" cy="252" r="7" />
        <rect className={styles.tint} x="341" y="252" width="6" height="16" rx="3" />

        {/* Technician */}
        <circle className={styles.tint} cx="104" cy="292" r="16" />
        <path className={styles.solid} d="M88 312q-14 36-6 74h42q6-38 0-74z" />
        <path className={styles.arm} d="M96 326q34-6 40-36" />
        <path className={styles.legs} d="M96 386l-10 42M124 386l18 44" />
      </g>
    </svg>
  );
}
