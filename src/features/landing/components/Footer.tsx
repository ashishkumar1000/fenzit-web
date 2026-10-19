import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.left}>© 2026 Fenzit. All rights reserved.</span>
      <span className={styles.right}>
        Questions?{" "}
        <a className={styles.link} href="mailto:hello@fenzit.com">
          hello@fenzit.com
        </a>
      </span>
    </footer>
  );
}
