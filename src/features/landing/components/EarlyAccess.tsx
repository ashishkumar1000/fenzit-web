import { Zap } from "lucide-react";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import { NotifyForm } from "./NotifyForm";
import styles from "./EarlyAccess.module.css";

// Only things the product does today. No offers or prices until the owner confirms them.
const PERKS: string[] = [
  "You get a reference number when you join.",
  "Built for owners and employees.",
  "Every team gets 90 days free.",
];

export function EarlyAccess() {
  return (
    <section id="early-access" className={styles.section} aria-labelledby="early-title">
      <Container>
        <div className={styles.panel}>
          <div className={styles.head}>
            <SectionHeading
              id="early-title"
              title="Join early access"
              lead="Leave your email and we will write when access opens."
            />
            <span className={styles.badge}>
              <Zap className={styles.badgeIcon} aria-hidden="true" focusable="false" />
            </span>
          </div>
          <NotifyForm />
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
