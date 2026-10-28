import {
  Activity,
  Briefcase,
  Building2,
  ClipboardList,
  Database,
  FileText,
  Gift,
  History,
  Image,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  Power,
  ShieldAlert,
  ShieldCheck,
  Server,
  Share2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import {
  PRIVACY_POLICY_PAGE,
  SECURITY_TRUST_PAGE,
  TERMS_PAGE,
  type PageMeta,
} from "../app/pageMeta";
import { Container } from "../components/ui/Container";
import { CONTACT_EMAIL, SALES_PHONE_DISPLAY, SALES_PHONE_HREF } from "../config/contact";
import { Footer } from "../features/landing/components/Footer";
import { Header } from "../features/landing/components/Header";
import {
  PRIVACY_LEAD,
  PRIVACY_SECTIONS,
  SECURITY_LEAD,
  SECURITY_SECTIONS,
  TERMS_LEAD,
  TERMS_SECTIONS,
  type LegalSection,
} from "./legalCopy";
import styles from "./LegalPage.module.css";

export type SectionFacts = { title: string; points: string[] };

export type RelatedLink = { to: string; label: string };

type LegalPageProps = {
  meta: PageMeta;
  id: string;
  title: string;
  lead: string;
  sections: LegalSection[];
  icons: Partial<Record<string, LucideIcon>>;
  facts?: Partial<Record<string, SectionFacts>>;
  related: RelatedLink[];
};

/** One numbered section card: the number, the icon, the title, the text and any facts. */
function LegalSectionCard({
  section,
  number,
  icons,
  facts,
}: {
  section: LegalSection;
  number: number;
  icons: LegalPageProps["icons"];
  facts: SectionFacts | undefined;
}) {
  const Icon = icons[section.id] ?? FileText;
  return (
    <section className={styles.card} aria-labelledby={section.id}>
      <div className={styles.cardHead}>
        <span className={styles.number} aria-hidden="true">
          {number}
        </span>
        <h2 id={section.id} className={styles.cardTitle}>
          {section.title}
        </h2>
        <Icon className={styles.cardIcon} aria-hidden="true" focusable="false" />
      </div>
      {section.paragraphs.map((text, index) => (
        <p key={`${section.id}-${index}`} className={styles.text}>
          {text}
        </p>
      ))}
      {facts && (
        <div className={styles.facts}>
          <p className={styles.factsTitle}>{facts.title}</p>
          <ul className={styles.factsList}>
            {facts.points.map((point, index) => (
              <li key={`${facts.title}-${index}`} className={styles.factItem}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * The shared frame for the legal pages: a title, a contents list, numbered section cards and a
 * help card. The header and footer are the shared ones.
 */
export function LegalPage({
  meta,
  id,
  title,
  lead,
  sections,
  icons,
  facts,
  related,
}: LegalPageProps) {
  return (
    <div className={styles.page}>
      <title>{meta.title}</title>
      <Header />
      <main className={styles.main}>
        <section className={styles.section} aria-labelledby={id}>
          <Container>
            <header className={styles.hero}>
              <h1 id={id} className={styles.title}>
                {title}
              </h1>
              <p className={styles.lead}>{lead}</p>
            </header>

            <div className={styles.layout}>
              <aside className={styles.side}>
                <nav className={styles.toc} aria-labelledby="legal-contents">
                  <p id="legal-contents" className={styles.sideTitle}>
                    On this page
                  </p>
                  <ol className={styles.tocList}>
                    {sections.map((section) => (
                      <li key={section.id}>
                        <a className={styles.tocLink} href={`#${section.id}`}>
                          {section.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>

                <div className={styles.help}>
                  <p className={styles.helpTitle}>Need legal clarification?</p>
                  <p className={styles.helpText}>Write to us or call, and the team will reply.</p>
                  <a className={styles.helpLink} href={`mailto:${CONTACT_EMAIL}`}>
                    <Mail className={styles.helpIcon} aria-hidden="true" focusable="false" />
                    {CONTACT_EMAIL}
                  </a>
                  <a className={styles.helpLink} href={SALES_PHONE_HREF}>
                    <Phone className={styles.helpIcon} aria-hidden="true" focusable="false" />
                    {SALES_PHONE_DISPLAY}
                  </a>
                </div>

                <nav className={styles.related} aria-labelledby="legal-related">
                  <p id="legal-related" className={styles.sideTitle}>
                    Related agreements
                  </p>
                  <ul className={styles.relatedList}>
                    {related.map((link) => (
                      <li key={link.to}>
                        <Link className={styles.relatedLink} to={link.to}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>

              <div className={styles.content}>
                {sections.map((section, index) => (
                  <LegalSectionCard
                    key={section.id}
                    section={section}
                    number={index + 1}
                    icons={icons}
                    facts={facts?.[section.id]}
                  />
                ))}
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// Each page's icons and facts. Every fact is stated in the legal copy or the privacy copy today.

const TERMS_ICONS = {
  "service-title": Briefcase,
  "account-title": KeyRound,
  "trial-title": Gift,
  "data-title": Database,
  "use-title": ShieldCheck,
  "availability-title": Activity,
  "stopping-title": Power,
  "changes-title": History,
  "contact-title": Mail,
};

const TERMS_FACTS: Partial<Record<string, SectionFacts>> = {
  "data-title": {
    title: "How your data is protected",
    points: [
      "Each company's data is kept apart from every other company.",
      "Our database and server are in Singapore.",
      "Photos and customer signatures are in private storage, opened through links that expire.",
      "Data sent between the app or website and our servers is encrypted over HTTPS.",
    ],
  },
};

export function TermsOfServicePage() {
  return (
    <LegalPage
      meta={TERMS_PAGE}
      id="terms-title"
      title="Terms of service"
      lead={TERMS_LEAD}
      sections={TERMS_SECTIONS}
      icons={TERMS_ICONS}
      facts={TERMS_FACTS}
      related={[
        { to: PRIVACY_POLICY_PAGE.path, label: "Privacy policy" },
        { to: SECURITY_TRUST_PAGE.path, label: "Security and trust" },
      ]}
    />
  );
}

const PRIVACY_ICONS = {
  "who-title": Building2,
  "collect-title": ClipboardList,
  "use-title": UserCheck,
  "share-title": Share2,
  "where-title": Server,
  "keep-title": History,
  "rights-title": UserCheck,
  "changes-title": History,
};

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      meta={PRIVACY_POLICY_PAGE}
      id="privacy-title"
      title="Privacy policy"
      lead={PRIVACY_LEAD}
      sections={PRIVACY_SECTIONS}
      icons={PRIVACY_ICONS}
      related={[
        { to: TERMS_PAGE.path, label: "Terms of service" },
        { to: SECURITY_TRUST_PAGE.path, label: "Security and trust" },
      ]}
    />
  );
}

const SECURITY_ICONS = {
  "signin-title": KeyRound,
  "separate-title": Building2,
  "transit-title": Lock,
  "files-title": Image,
  "location-title": MapPin,
  "report-title": ShieldAlert,
};

export function SecurityTrustPage() {
  return (
    <LegalPage
      meta={SECURITY_TRUST_PAGE}
      id="security-title"
      title="Security and trust"
      lead={SECURITY_LEAD}
      sections={SECURITY_SECTIONS}
      icons={SECURITY_ICONS}
      related={[
        { to: PRIVACY_POLICY_PAGE.path, label: "Privacy policy" },
        { to: TERMS_PAGE.path, label: "Terms of service" },
      ]}
    />
  );
}
