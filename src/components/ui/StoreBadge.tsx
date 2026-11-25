import { APP_STORE_URL, PLAY_STORE_URL } from "../../config/appStores";
import playBadge from "../../assets/brand/get-it-on-google-play.png";
import appStoreBadge from "../../assets/brand/download-on-the-app-store.svg";
import styles from "./StoreBadge.module.css";

type StoreBadgeProps = {
  /** "md" for the hero and download panel, "sm" for the footer. */
  size?: "md" | "sm";
  /** Omit to show both badges; pass one store for the download page's per-platform sections. */
  store?: "play" | "appStore";
};

type BadgeProps = {
  href: string;
  image: string;
  width: number;
  height: number;
  label: string;
};

/**
 * One official store badge, as an external link to its listing. Each image
 * ships with its own brand chrome, so the styles only size it; the anchor
 * carries the full name for screen readers, because the words in the badge
 * picture are not real text.
 */
function Badge({ href, image, width, height, label }: BadgeProps) {
  return (
    <a
      className={styles.badge}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      <img className={styles.image} src={image} width={width} height={height} alt="" />
    </a>
  );
}

/**
 * The official store badges, as external links to the listing URLs in config.
 * Renders both stores by default; the download page passes `store` to show one.
 */
export function StoreBadge({ size = "md", store }: StoreBadgeProps) {
  const badges = (
    <>
      {(store ?? "play") === "play" ? (
        <Badge
          href={PLAY_STORE_URL}
          image={playBadge}
          width={564}
          height={168}
          label="Get Fenzit on Google Play (opens the Play Store)"
        />
      ) : null}
      {(store ?? "appStore") === "appStore" ? (
        <Badge
          href={APP_STORE_URL}
          image={appStoreBadge}
          width={480}
          height={160}
          label="Download Fenzit on the App Store (opens the App Store)"
        />
      ) : null}
    </>
  );

  // The wrapper carries both badges and the size: one badge in it is laid out the same,
  // and `size="sm"` keeps working on the download page's per-store sections.
  return (
    <span className={size === "sm" ? `${styles.row} ${styles.sm}` : styles.row}>{badges}</span>
  );
}
