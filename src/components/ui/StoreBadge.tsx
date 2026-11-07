import { PLAY_STORE_URL } from "../../config/appStores";
import playBadge from "../../assets/brand/get-it-on-google-play.png";
import styles from "./StoreBadge.module.css";

type StoreBadgeProps = {
  /** "md" for the hero and download panel, "sm" for the footer. */
  size?: "md" | "sm";
};

/**
 * The official "Get it on Google Play" badge, as an external link to the one
 * listing URL in config. The image ships with its own brand chrome, so the
 * styles only size it; the anchor carries the full name for screen readers,
 * because the words in the badge picture are not real text.
 */
export function StoreBadge({ size = "md" }: StoreBadgeProps) {
  return (
    <a
      className={size === "sm" ? `${styles.badge} ${styles.sm}` : styles.badge}
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get Fenzit on Google Play (opens the Play Store)"
    >
      <img className={styles.image} src={playBadge} width={564} height={168} alt="" />
    </a>
  );
}
