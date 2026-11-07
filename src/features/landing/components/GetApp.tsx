import { LinkButton } from "../../../components/ui/LinkButton";
import { StoreBadge } from "../../../components/ui/StoreBadge";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import styles from "./GetApp.module.css";

// Only facts true in the product today.
const PERKS: string[] = [
  "Built for owners and employees.",
  "Phone-number sign-in — no usernames.",
  "Every team gets 90 days free.",
];

/** The home-page download panel, where the early-access form used to be. */
export function GetApp() {
  return (
    <section id="get-app" className={styles.section} aria-labelledby="get-app-title">
      <Container>
        <div className={styles.panel}>
          <div className={styles.body}>
            <SectionHeading
              id="get-app-title"
              title="Get the Fenzit app"
              lead="Live on Google Play for Android phones. Every team gets 90 days free."
            />
            <div className={styles.actions}>
              <StoreBadge />
              <LinkButton to="/book-demo" variant="secondary">
                Prefer a walkthrough? Book a demo
              </LinkButton>
            </div>
          </div>
          <ul className={styles.perks}>
            {PERKS.map((perk) => (
              <li key={perk} className={styles.perk}>
                <span className={styles.dot} aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
