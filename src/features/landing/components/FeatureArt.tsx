import styles from "./FeatureArt.module.css";

// Small flat drawings for the feature previews. Decorative, so screen readers skip them.
// Colours come from tokens in FeatureArt.module.css, never from raw values here.

export function PhotoArt() {
  return (
    <svg
      className={styles.photo}
      viewBox="0 0 120 80"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="120" height="80" className={styles.skyFill} />
      <circle cx="90" cy="24" r="9" className={styles.sunFill} />
      <path d="M0 80 L36 42 L62 64 L82 48 L120 80 Z" className={styles.hillBack} />
      <path d="M0 80 L24 58 L50 74 L120 80 Z" className={styles.hillFront} />
    </svg>
  );
}

export function SignatureArt() {
  return (
    <svg className={styles.signature} viewBox="0 0 160 40" aria-hidden="true" focusable="false">
      <line x1="0" y1="36" x2="160" y2="36" className={styles.signatureRule} />
      <path
        d="M4 28 C 16 4, 26 8, 34 24 S 46 38, 56 20 S 72 2, 82 20 S 100 36, 112 16 S 134 4, 156 18"
        className={styles.signatureInk}
      />
    </svg>
  );
}

export function RouteArt() {
  return (
    <svg className={styles.route} viewBox="0 0 160 52" aria-hidden="true" focusable="false">
      <path d="M16 40 C 44 40, 44 12, 80 12 S 120 40, 144 14" className={styles.routeLine} />
      <circle cx="16" cy="40" r="6" className={styles.pinStart} />
      <circle cx="144" cy="14" r="7" className={styles.pinEnd} />
      <circle cx="144" cy="14" r="2.5" className={styles.pinCore} />
    </svg>
  );
}

export function MapArt() {
  return (
    <svg
      className={styles.map}
      viewBox="0 0 320 140"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M-10 100 H330 M110 -10 V150 M230 -10 C240 50 210 90 250 150"
        className={styles.street}
      />
      <circle cx="160" cy="62" r="50" className={styles.fenceFill} />
      <circle cx="160" cy="62" r="50" className={styles.fenceRing} />
      <circle cx="160" cy="62" r="8" className={styles.pin} />
      <circle cx="160" cy="62" r="3" className={styles.pinCore} />
      <g transform="translate(204 30)">
        <circle r="11" className={styles.checkBadge} />
        <path d="M-4.5 0 L-1 3.5 L5 -3" className={styles.checkMark} />
      </g>
    </svg>
  );
}

export function ProgressArt() {
  return (
    <svg className={styles.progress} viewBox="0 0 200 16" aria-hidden="true" focusable="false">
      <line x1="8" y1="8" x2="192" y2="8" className={styles.track} />
      <line x1="8" y1="8" x2="100" y2="8" className={styles.trackDone} />
      <circle cx="8" cy="8" r="6" className={styles.dotDone} />
      <circle cx="100" cy="8" r="6" className={styles.dotCurrent} />
      <circle cx="192" cy="8" r="6" className={styles.dotTodo} />
    </svg>
  );
}

export function GeofenceArt() {
  return (
    <svg className={styles.fence} viewBox="0 0 240 72" aria-hidden="true" focusable="false">
      <circle cx="120" cy="36" r="30" className={styles.fenceFill} />
      <circle cx="120" cy="36" r="30" className={styles.fenceRing} />
      <circle cx="120" cy="36" r="7" className={styles.pin} />
      <circle cx="120" cy="36" r="2.5" className={styles.pinCore} />
      <g transform="translate(160 22)">
        <circle r="10" className={styles.checkBadge} />
        <path d="M-4 0 L-1 3 L4.5 -3" className={styles.checkMark} />
      </g>
    </svg>
  );
}

export function GeofenceMapArt() {
  return (
    <svg
      className={styles.fenceMap}
      viewBox="0 0 320 120"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="320" height="120" rx="12" className={styles.mapGround} />
      <path
        d="M-10 84 H330 M96 -10 V130 M236 -10 C244 40 214 80 252 130"
        className={styles.street}
      />
      <circle cx="160" cy="60" r="44" className={styles.fenceFill} />
      <circle cx="160" cy="60" r="44" className={styles.fenceRing} />
      <circle cx="160" cy="60" r="8" className={styles.pin} />
      <circle cx="160" cy="60" r="3" className={styles.pinCore} />
      <g transform="translate(204 22)">
        <circle r="11" className={styles.checkBadge} />
        <path d="M-4.5 0 L-1 3.5 L5 -3" className={styles.checkMark} />
      </g>
    </svg>
  );
}

/** A faint dot grid for the back of a card. Decorative texture, not content. */
export function DotGridArt() {
  return (
    <svg className={styles.dotGrid} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="hero-dot-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className={styles.gridDot} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-dot-grid)" />
    </svg>
  );
}

/** Seven flat bars for a month of daily attendance. Heights are sample values. */
export function MonthlyBarsArt() {
  const heights = [34, 46, 40, 52, 44, 56, 48];
  return (
    <svg
      className={styles.bars}
      viewBox="0 0 280 60"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {heights.map((height, index) => (
        <rect
          key={index}
          x={index * 40 + 6}
          y={60 - height}
          width={28}
          height={height}
          rx={4}
          className={index === 5 ? styles.barCurrent : styles.bar}
        />
      ))}
    </svg>
  );
}
