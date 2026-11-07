import { Link } from "react-router";
import { Container } from "../../../components/ui/Container";
import logo from "../../../assets/brand/logo.png";
import logo2x from "../../../assets/brand/logo-2x.png";
import logo3x from "../../../assets/brand/logo-3x.png";
import { SALES_PHONE_DISPLAY, SALES_PHONE_HREF } from "../../../config/contact";
import { useIsSignedIn } from "../../../hooks/useIsSignedIn";
import { clearSession } from "../../../services/session";
// TEMPORARY, LOCAL TEST ONLY. See the note where the wordmark is rendered.
import startupIndiaWordmark from "../../../assets/brand/startupindia-wordmark.LOCAL-TEST.png";
import styles from "./Header.module.css";

// Links to the sections on the home page. Qualified with the path so they work from every page,
// not only from home itself. The header stays on screen while the visitor scrolls.
const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#faq", label: "Questions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/book-demo", label: "Book a demo" },
] as const;

export function Header() {
  const isSignedIn = useIsSignedIn();
  return (
    <>
      <div className={styles.strip}>
        <p className={styles.stripText}>The Fenzit Android app is live on Google Play.</p>
        <a className={styles.stripLink} href="/#get-app">
          Get the app
        </a>
        <a className={styles.stripLink} href={SALES_PHONE_HREF}>
          Call {SALES_PHONE_DISPLAY}
        </a>
      </div>
      <header className={styles.header}>
        <Container>
          <div className={styles.bar}>
            <div className={styles.brandGroup}>
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
              {/* TEMPORARY, LOCAL TEST ONLY: Startup India wordmark. Kept outside the home link so the
                link's name stays "Fenzit". Remove or replace before any commit or deploy. */}
              <img
                className={styles.partnerWordmark}
                src={startupIndiaWordmark}
                width={96}
                height={23}
                alt="Startup India"
              />
            </div>
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
            {!isSignedIn ? (
              <a className={styles.login} href="/login">
                Log in
              </a>
            ) : (
              <button
                type="button"
                className={`${styles.login} ${styles.logout}`}
                onClick={() => {
                  clearSession();
                  window.location.reload();
                }}
              >
                Log out
              </button>
            )}
          </div>
        </Container>
      </header>
    </>
  );
}
