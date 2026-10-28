import type { CSSProperties } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router";
import logo from "../../../assets/brand/logo.png";
import logo2x from "../../../assets/brand/logo-2x.png";
import logo3x from "../../../assets/brand/logo-3x.png";
import { Container } from "../../../components/ui/Container";
import {
  CONTACT_EMAIL,
  LINKEDIN_URL,
  SALES_PHONE_DISPLAY,
  SALES_PHONE_HREF,
} from "../../../config/contact";
import styles from "./Footer.module.css";

/** The company pages. "live" marks the one that takes sign-ups today. */
const COMPANY_PAGES = [
  { to: "/pricing", label: "Pricing" },
  { to: "/book-demo", label: "Book a demo", badge: "Live" },
  { to: "/data-safety", label: "Your data", locked: true },
  { to: "/partners", label: "Partners" },
];

/** The product pages, with a short line under each title. */
const SOLUTION_CARDS = [
  { to: "/features", label: "Features", note: "Platform overview" },
  { to: "/attendance", label: "Attendance and leave", note: "Unified shift tracking" },
  {
    to: "/employee-attendance-app",
    label: "Employee attendance app",
    note: "iOS & Android mobile",
  },
  { to: "/geofencing-attendance", label: "Geofencing attendance", note: "Location-verified logs" },
  { to: "/leave-management-software", label: "Leave management", note: "Approval workflows" },
  { to: "/field-job-tracking", label: "Field job tracking", note: "Status & dispatch" },
  {
    to: "/technician-tracking-software",
    label: "Technician tracking",
    note: "Route & milestone sync",
  },
  {
    to: "/service-business-software",
    label: "Service businesses",
    note: "Tailored multi-location enterprise suite",
    wide: true,
  },
];

/** The legal pages, in the bottom strip. */
const LEGAL_PAGES = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/security-trust", label: "Security & Trust" },
];

/** The industry pages, shown as tags. */
const INDUSTRY_PAGES = [
  { to: "/ac-service-software", label: "AC service" },
  { to: "/appliance-repair-software", label: "Appliance repair" },
  { to: "/cctv-installation-software", label: "CCTV installation" },
  { to: "/cleaning-services-software", label: "Cleaning services" },
  { to: "/collection-agent-tracking", label: "Collection agents" },
  { to: "/delivery-tracking", label: "Delivery" },
  { to: "/electrician-software", label: "Electricians" },
  { to: "/facility-management-software", label: "Facility management" },
  { to: "/it-amc-software", label: "IT AMC" },
  { to: "/pest-control-software", label: "Pest control" },
  { to: "/plumber-software", label: "Plumbers" },
  { to: "/salon-at-home-software", label: "Salon at home" },
  { to: "/solar-installation-software", label: "Solar installation" },
  { to: "/water-purifier-service-software", label: "Water purifier service" },
];

/** A small padlock, drawn here so it takes the text colour around it. */
function LockIcon() {
  return (
    <svg
      className={styles.lock}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

/** The LinkedIn mark: a rounded square with the letters cut out in the card colour. */
function LinkedInIcon() {
  const cutout: CSSProperties = { fill: "var(--color-surface-card)" };
  return (
    <svg className={styles.social} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="24" height="24" rx="4" fill="currentColor" />
      <rect x="5" y="9" width="3" height="10" style={cutout} />
      <circle cx="6.5" cy="5.5" r="1.9" style={cutout} />
      <path
        d="M10 9h2.9v1.4c.5-.9 1.6-1.6 3.1-1.6 3 0 3.5 2 3.5 4.5V19h-3v-5c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6V19h-3V9z"
        style={cutout}
      />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.grid}>
          <div className={styles.side}>
            <nav aria-label="Company pages">
              <div className={styles.sectionHead}>
                <p className={styles.groupTitle}>Company</p>
              </div>
              <ul className={styles.companyList}>
                {COMPANY_PAGES.map((page) => (
                  <li key={page.to}>
                    <Link className={styles.companyLink} to={page.to}>
                      {page.label}
                      {page.badge && <span className={styles.badge}>{page.badge}</span>}
                      {page.locked && <LockIcon />}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className={styles.note}>
              <h3 className={styles.noteTitle}>Built for high-trust field teams</h3>
              <p className={styles.noteBody}>
                Empowering field technicians, contractors, and distributed fleets with accurate
                real-time geofenced intelligence.
              </p>
            </div>
          </div>
          <div className={styles.contactRow}>
            {LINKEDIN_URL ? (
              <a
                className={styles.socialLink}
                href={LINKEDIN_URL}
                rel="noopener noreferrer"
                target="_blank"
                aria-label="Fenzit on LinkedIn"
              >
                <LinkedInIcon />
              </a>
            ) : (
              // No address yet: the icon shows, but it is not a link and says so.
              <span className={styles.socialSoon} role="img" aria-label="LinkedIn, coming soon">
                <LinkedInIcon />
              </span>
            )}
            <div className={styles.contactBar}>
              <span className={styles.contactLabel}>
                <MessageCircle
                  className={styles.contactIcon}
                  aria-hidden="true"
                  focusable="false"
                />
                Questions?
              </span>
              <a className={styles.contactItem} href={SALES_PHONE_HREF}>
                <Phone className={styles.contactIcon} aria-hidden="true" focusable="false" />
                {SALES_PHONE_DISPLAY}
              </a>
              <span className={styles.contactDivider} aria-hidden="true" />
              <a className={styles.contactEmail} href={`mailto:${CONTACT_EMAIL}`}>
                <Mail className={styles.contactIcon} aria-hidden="true" focusable="false" />
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          <div className={styles.main}>
            <nav aria-label="Solution pages">
              <div className={styles.sectionHead}>
                <p className={styles.groupTitle}>Solutions &amp; capabilities</p>
              </div>
              <ul className={styles.cards}>
                {SOLUTION_CARDS.map((card) => (
                  <li key={card.to} className={card.wide ? styles.wideCard : undefined}>
                    <Link className={styles.card} to={card.to}>
                      <span className={styles.cardTitle}>{card.label}</span>
                      <span className={styles.cardNote}>{card.note}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Industry pages">
              <div className={styles.sectionHead}>
                <p className={styles.groupTitle}>Industry verticals</p>
                <span className={styles.count}>{INDUSTRY_PAGES.length} specialized workflows</span>
              </div>
              <ul className={styles.tags}>
                {INDUSTRY_PAGES.map((page) => (
                  <li key={page.to}>
                    <Link className={styles.tag} to={page.to}>
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </Container>
      <div className={styles.bar}>
        <Container>
          <div className={styles.barInner}>
            <div className={styles.copyRow}>
              {/* The brand glyph in black and white. Decorative: the copyright line names the company. */}
              <img
                className={styles.mark}
                src={logo}
                srcSet={`${logo} 1x, ${logo2x} 2x, ${logo3x} 3x`}
                width={20}
                height={20}
                alt=""
              />
              <span className={styles.copy}>© 2026 Fenzit. All rights reserved.</span>
            </div>
            <nav aria-label="Legal pages">
              <ul className={styles.legalList}>
                {LEGAL_PAGES.map((page, index) => (
                  <li key={page.to} className={styles.legalItem}>
                    {index > 0 && <span className={styles.dot} aria-hidden="true" />}
                    <Link className={styles.legalLink} to={page.to}>
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </Container>
      </div>
    </footer>
  );
}
