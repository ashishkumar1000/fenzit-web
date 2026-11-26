import { FenzitMark } from "./FenzitMark";
import styles from "./FenzitLoader.module.css";

/**
 * The Fenzit loading status (2026-11-26) built on FenzitMark: the mark
 * fills with its gradient artwork behind a rising wave mask (one 4.7s
 * one-shot with indefinite slosh and bubbles — see FenzitMark.tsx for the
 * mechanics and the reduced-motion contract). Both variants share the one
 * artwork; nothing here animates per loop.
 *
 * Variants (owner 2026-11-26: no wordmark text — the artwork stands alone):
 *   - "hero": the mark alone at 112px (override with --fenzit-hero-size)
 *     for page-level loading.
 *   - "inline" (default): the mark alone at 30px (override with
 *     --fenzit-inline-size) for buttons, cards and small pending states.
 *
 * The wrapper is role="status" so screen readers announce `label`
 * ("Loading…" by default) once; the mark is aria-hidden, so only the
 * plain-English label is announced.
 */
export type FenzitLoaderVariant = "hero" | "inline";

export function FenzitLoader({
  variant = "inline",
  label = "Loading…",
  className,
}: {
  variant?: FenzitLoaderVariant;
  label?: string;
  className?: string;
}) {
  const variantClass = variant === "hero" ? styles.hero : styles.inline;
  return (
    <div
      role="status"
      className={className === undefined ? variantClass : `${variantClass} ${className}`}
    >
      <FenzitMark />
      <span className={styles.srStatus}>{label}</span>
    </div>
  );
}
