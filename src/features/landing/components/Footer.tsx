import { Container } from "../../../components/ui/Container";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.bar}>
          <span className={styles.left}>© 2026 Fenzit. All rights reserved.</span>
          <span className={styles.right}>
            Questions?{" "}
            <a className={styles.link} href="mailto:hello@fenzit.com">
              hello@fenzit.com
            </a>
          </span>
        </div>
      </Container>
    </footer>
  );
}
