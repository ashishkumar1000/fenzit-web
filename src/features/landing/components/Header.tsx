import { Container } from "../../../components/ui/Container";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.bar}>
          <div className={styles.logo}>
            {/* Same brand glyph as the mobile app. Decorative: the wordmark beside it names the brand. */}
            <img
              className={styles.mark}
              src="/brand/logo.png"
              srcSet="/brand/logo.png 1x, /brand/logo-2x.png 2x, /brand/logo-3x.png 3x"
              width={36}
              height={36}
              alt=""
            />
            <span>Fenzit</span>
          </div>
        </div>
      </Container>
    </header>
  );
}
