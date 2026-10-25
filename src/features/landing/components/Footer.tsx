import { Link } from "react-router";
import { Container } from "../../../components/ui/Container";
import styles from "./Footer.module.css";

/** The site's public pages, so people and crawlers can reach them from every page. */
const PAGES = [
  { to: "/features", label: "Features" },
  { to: "/attendance", label: "Attendance and leave" },
  { to: "/field-job-tracking", label: "Field job tracking" },
  { to: "/ac-service-software", label: "AC service" },
  { to: "/plumber-software", label: "Plumbers" },
  { to: "/delivery-tracking", label: "Delivery" },
  { to: "/collection-agent-tracking", label: "Collection agents" },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container>
        <nav className={styles.pages} aria-label="Site pages">
          {PAGES.map((page) => (
            <Link key={page.to} className={styles.pageLink} to={page.to}>
              {page.label}
            </Link>
          ))}
        </nav>
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
