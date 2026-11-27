import styles from "./Avatar.module.css";

/** A person's photo when one is set; otherwise their initials on the
 *  console's gradient tile. Lifted out of MembersTable so the Customers
 *  table renders the same faces. `large` is the profile header's tile. */
export function Avatar({
  name,
  imageUrl,
  size = "default",
}: {
  name: string | null;
  imageUrl?: string | null;
  size?: "default" | "large";
}) {
  const initials = (name ?? "?")
    .split(/\s+/)
    .filter((part: string) => part.length > 0)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("");
  const large = size === "large";
  return (
    <span className={`${styles.avatar}${large ? ` ${styles.avatarLarge}` : ""}`}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className={styles.avatarImage} />
      ) : (
        <span
          className={`${styles.avatarInitials} ${styles.avatarTile}${large ? ` ${styles.avatarInitialsLarge}` : ""}`}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
    </span>
  );
}
