import { Link } from "react-router";
import { Container } from "../../../components/ui/Container";
import logo from "../../../assets/brand/logo.png";
import logo2x from "../../../assets/brand/logo-2x.png";
import logo3x from "../../../assets/brand/logo-3x.png";
import styles from "./Header.module.css";

// Links to the sections on the home page. Qualified with the path so they work from every page,
// not only from home itself. The header stays on screen while the visitor scrolls.
const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#trust", label: "Your data" },
  { href: "/#faq", label: "Questions" },
] as const;

export function Header() {
  return (
    <>
      <div className={styles.strip}>
        <p className={styles.stripText}>Early access is open for field service teams.</p>
        <a className={styles.stripLink} href="/#early-access">
          Join early access
        </a>
      </div>
      <header className={styles.header}>
        <Container>
          <div className={styles.bar}>
            {/* The brand is the home link, on every page. */}
            <Link to="/" className={styles.logo}>
              {/* Same brand glyph as the mobile app. Decorative: the wordmark beside it names the brand. */}
              <img
                className={styles.mark}
                src={logo}
                srcSet={`${logo} 1x, ${logo2x} 2x, ${logo3x} 3x`}
                width={36}
                height={36}
                alt=""
              />
              <span>Fenzit</span>
            </Link>
            <nav aria-label="Page sections" className={styles.nav}>
              <ul className={styles.links}>
                {LINKS.map((link) => (
                  <li key={link.href}>
                    <a className={styles.navLink} href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <a className={styles.login} href="/login">
              Log in
            </a>
            <a className={styles.cta} href="/#early-access">
              Join early access
            </a>
          </div>
        </Container>
      </header>
    </>
  );
}
