import { FenzitLoader } from "./FenzitLoader";
import styles from "./FullPageLoader.module.css";

/**
 * Full-page boot loader (CAP-1, 2026-11-26): the Pour hero loader centered
 * on a light pane that softly blurs whatever is behind it, for the console's
 * boot/auth moments — a hard load of /admin while the access check runs.
 * It is not for in-app navigation: those get content-region skeletons.
 *
 * The pane follows the console's overlay convention (fixed, inset 0,
 * z-index 50 — the same layer the dialogs sit on). The scrim is the page
 * surface at 60% opacity, so it is mostly opaque and the 8px blur behind it
 * is decoration, never the legibility mechanism (WCAG 1.4.3); and because
 * the loader is a child of the pane, the blur only ever touches the page
 * content behind it — the mark itself stays crisp.
 *
 * Accessibility: the hosted FenzitLoader is the single role="status" and
 * announces `label` ("Loading…" by default) politely; the animated mark is
 * aria-hidden.
 */
export function FullPageLoader({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={className === undefined ? styles.pane : `${styles.pane} ${className}`}>
      <FenzitLoader variant="hero" label={label} />
    </div>
  );
}
