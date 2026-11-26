import { FenzitLoader } from "./FenzitLoader";
import { SKELETON_DELAY_MS, SKELETON_MIN_DISPLAY_MS, SkeletonDelay } from "./Skeleton";
import styles from "./LoadingOverlay.module.css";

/**
 * The console's activity overlay (2026-11-26): the Pour hero loader
 * floating over the console while an API call is in flight — the
 * replacement for the demoted 3px line loader, loud enough to register
 * from the bottom of a long page (the owner's complaint scenario).
 *
 * The pane is fully transparent and click-through: no scrim, no blur, the
 * shell beneath stays interactive, and the centered loader is the only
 * thing that paints. The hosted FenzitLoader is the single role="status"
 * (polite, `label`, "Loading…" by default) and its mark is aria-hidden;
 * reduced motion is handled inside it (static filled mark + pulse).
 *
 * Timing follows the loading cases: the overlay appears only after 300ms
 * of continuous pending and stays at least 500ms once shown, so quick
 * local operations never flash it. `show` should come from router
 * activity — navigation, revalidation and fetchers.
 */
export function LoadingOverlay({
  show = false,
  label = "Loading…",
}: {
  show?: boolean;
  label?: string;
}) {
  return (
    <SkeletonDelay
      show={show}
      delayMs={SKELETON_DELAY_MS}
      minDisplayMs={SKELETON_MIN_DISPLAY_MS}
      className={styles.overlay}
    >
      <FenzitLoader variant="hero" label={label} />
    </SkeletonDelay>
  );
}
