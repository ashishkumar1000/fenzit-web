import { Link } from "react-router";
import { Container } from "../../../components/ui/Container";
import styles from "./Footer.module.css";

/** The site's public pages, so people and crawlers can reach them from every page. */
const PAGES = [
  { to: "/features", label: "Features" },
  { to: "/attendance", label: "Attendance and leave" },
  { to: "/employee-attendance-app", label: "Employee attendance app" },
  { to: "/geofencing-attendance", label: "Geofencing attendance" },
  { to: "/leave-management-software", label: "Leave management" },
  { to: "/field-job-tracking", label: "Field job tracking" },
  { to: "/technician-tracking-software", label: "Technician tracking" },
  { to: "/service-business-software", label: "Service businesses" },
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
