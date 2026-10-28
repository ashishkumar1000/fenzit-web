import { BOOK_DEMO_PAGE, DATA_SAFETY_PAGE, PARTNERS_PAGE, PRICING_PAGE } from "../app/pageMeta";
import { LinkButton } from "../components/ui/LinkButton";
import { CONTACT_EMAIL, SALES_PHONE_DISPLAY, SALES_PHONE_HREF } from "../config/contact";
import { DemoRequestForm } from "../features/landing/components/ContactForms";
import { SimplePage, SimpleSection } from "./SimplePage";
import styles from "./InfoPages.module.css";

// The four plain public pages. Each statement is something the app or the team does today.
// No prices are shown until the owner confirms them.

export function PricingPage() {
  return (
    <SimplePage
      meta={PRICING_PAGE}
      id="pricing-title"
      title="Pricing"
      lead="Every team gets 3 months free to try Fenzit."
    >
      <SimpleSection
        id="trial-title"
        title="3 months free for every team"
        paragraphs={["Your team can use everything on our features page for the first 3 months."]}
      >
        <div className={styles.actions}>
          <LinkButton href="/features" variant="secondary">
            See the features
          </LinkButton>
        </div>
      </SimpleSection>
      <SimpleSection
        id="price-title"
        title="After the trial"
        paragraphs={[
          "We will tell you the price for your team before the 3 months end. Ask us any time.",
        ]}
      >
        <div className={styles.actions}>
          <LinkButton href={SALES_PHONE_HREF} variant="secondary">
            Call {SALES_PHONE_DISPLAY}
          </LinkButton>
          <LinkButton href={`mailto:${CONTACT_EMAIL}`} variant="secondary">
            Email {CONTACT_EMAIL}
          </LinkButton>
        </div>
      </SimpleSection>
    </SimplePage>
  );
}

export function BookDemoPage() {
  return (
    <SimplePage
      meta={BOOK_DEMO_PAGE}
      id="demo-title"
      title="Book a demo"
      lead="Tell us about your team. We will reach out to set up a time to show you Fenzit."
    >
      <SimpleSection id="demo-form-title" title="Your details">
        <DemoRequestForm />
      </SimpleSection>
      <div className={styles.aside}>
        <p className={styles.asideTitle}>Prefer to talk now?</p>
        <div className={styles.actions}>
          <LinkButton href={SALES_PHONE_HREF} variant="secondary">
            Call {SALES_PHONE_DISPLAY}
          </LinkButton>
        </div>
      </div>
    </SimplePage>
  );
}

export function DataSafetyPage() {
  return (
    <SimplePage
      meta={DATA_SAFETY_PAGE}
      id="data-title"
      title="Your data"
      lead="What Fenzit keeps, and who can see it."
    >
      <SimpleSection
        id="signin-title"
        title="How people sign in"
        paragraphs={["With their phone number and a one-time code."]}
      />
      <SimpleSection
        id="separate-title"
        title="Kept separate for each company"
        paragraphs={["Each company sees only its own jobs, attendance, people and reports."]}
      />
      <SimpleSection
        id="location-title"
        title="Location"
        paragraphs={["Location is taken only at job steps and attendance check-ins that need it."]}
      />
      <SimpleSection
        id="questions-title"
        title="Questions about your data"
        paragraphs={[`Write to ${CONTACT_EMAIL} and we will answer.`]}
      />
    </SimplePage>
  );
}

export function PartnersPage() {
  return (
    <SimplePage
      meta={PARTNERS_PAGE}
      id="partners-title"
      title="Partners"
      lead="Bring Fenzit to the field service businesses you already work with."
    >
      <SimpleSection
        id="who-title"
        title="Who we want to talk to"
        paragraphs={[
          "Installers, service companies and software resellers who work with field teams.",
        ]}
      >
        <div className={styles.actions}>
          <LinkButton href={`mailto:${CONTACT_EMAIL}`} variant="secondary">
            Email {CONTACT_EMAIL}
          </LinkButton>
          <LinkButton href={SALES_PHONE_HREF} variant="secondary">
            Call {SALES_PHONE_DISPLAY}
          </LinkButton>
        </div>
      </SimpleSection>
    </SimplePage>
  );
}
