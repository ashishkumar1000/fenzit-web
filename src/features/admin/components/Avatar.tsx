import styles from "./Avatar.module.css";

/** A person's photo when one is set; otherwise their initials on the
 *  console's gradient tile. Lifted out of MembersTable so the Customers
 *  table renders the same faces. */
export function Avatar({ name, imageUrl }: { name: string | null; imageUrl?: string | null }) {
  const initials = (name ?? "?")
    .split(/\s+/)
    .filter((part: string) => part.length > 0)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("");
  return (
    <span className={styles.avatar}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className={styles.avatarImage} />
      ) : (
        <span className={`${styles.avatarInitials} ${styles.avatarTile}`} aria-hidden="true">
          {initials}
        </span>
      )}
    </span>
  );
}
