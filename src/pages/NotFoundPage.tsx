import { Link } from "react-router";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Page not found</h1>
      <p>
        <Link className={styles.link} to="/">
          Go to home
        </Link>
      </p>
    </main>
  );
}
