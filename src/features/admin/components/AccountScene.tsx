import styles from "./AccountScene.module.css";

/**
 * Original artwork for the empty side of the Account card: a person's record
 * with three switches (their access settings), linked to a shield that marks the
 * change as checked. Hand-drawn on a 440×300 grid, with colours from the
 * stylesheet. Decorative: the text beside it carries the meaning, so it is hidden
 * from screen readers.
 */

/** Switch rows on the person's card: y position and whether the switch is on. */
const SWITCHES: { y: number; on: boolean }[] = [
  { y: 166, on: true },
  { y: 192, on: false },
  { y: 218, on: true },
];

export function AccountScene() {
  return (
    <svg
      className={styles.scene}
      viewBox="0 0 440 300"
      width="100%"
      aria-hidden="true"
      focusable="false"
    >
      <rect className={styles.panel} x={10} y={8} width={420} height={284} rx={20} />

      {/* The link from the person's card to the shield. */}
      <path className={styles.link} d="M262 150H300" />

      {/* The person's record. */}
      <rect className={styles.card} x={70} y={64} width={190} height={170} rx={16} />
      <circle className={styles.avatar} cx={116} cy={112} r={22} />
      <path className={styles.face} d="M106 122A11 11 0 0 0 126 122" />
      <path className={styles.line} d="M152 104H226M152 120H212" />

      <path className={styles.divider} d="M90 146H240" />

      {/* Three switches for the access settings. */}
      {SWITCHES.map((row) => (
        <g key={row.y}>
          <path className={styles.line} d={`M90 ${row.y}H150`} />
          <rect
            className={row.on ? styles.switchOn : styles.switchOff}
            x={190}
            y={row.y - 7}
            width={44}
            height={14}
            rx={7}
          />
          <circle className={styles.knob} cx={row.on ? 227 : 197} cy={row.y} r={5} />
        </g>
      ))}

      {/* The shield: the change is checked before it is saved. */}
      <circle className={styles.shieldRing} cx={338} cy={150} r={38} />
      <path
        className={styles.shield}
        d="M338 122L358 131V150C358 166 349 174 338 178C327 174 318 166 318 150V131Z"
      />
      <path className={styles.check} d="M328 150L335 157L349 142" />

      {/* Small plus marks and dots, for texture. */}
      <path className={styles.sparkle} d="M30 96H38M34 92V100M404 214H412M408 210V218" />
      <circle className={styles.dot} cx={36} cy={206} r={2.5} />
      <circle className={styles.dot} cx={402} cy={84} r={2.5} />
    </svg>
  );
}
