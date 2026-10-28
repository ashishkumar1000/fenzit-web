import { Check } from "lucide-react";
import { LinkButton } from "../../../components/ui/LinkButton";
import { CONTACT_EMAIL } from "../../../config/contact";
import { PLANS, type PlanTier } from "../pricingContent";
import { PricingSectionHead } from "./PricingSectionHead";
import styles from "./PlanCards.module.css";

// Each plan's button. Starter and Growth lead to a demo, since there is no sign-up page yet.
// Enterprise goes to the email address the team reads.
function PlanAction({ plan }: { plan: PlanTier }) {
  const variant = plan.highlighted ? "primary" : "secondary";
  if (plan.key === "enterprise") {
    return (
      <LinkButton href={`mailto:${CONTACT_EMAIL}`} variant={variant}>
        {plan.cta}
      </LinkButton>
    );
  }
  return (
    <LinkButton to="/book-demo" variant={variant}>
      {plan.cta}
    </LinkButton>
  );
}

/** The three plan cards. Every plan starts with the same 90 days free. */
export function PlanCards() {
  return (
    <section className={styles.section} aria-labelledby="plans-title">
      <PricingSectionHead
        id="plans-title"
        title="Plans for every team"
        lead="Every plan starts with 90 days free. After that, pick the plan that fits your team."
      />
      <ul className={styles.grid}>
        {PLANS.map((plan) => (
          <li
            key={plan.key}
            className={plan.highlighted ? `${styles.card} ${styles.highlight}` : styles.card}
          >
            {plan.highlighted ? <span className={styles.popular}>Most popular</span> : null}
            <div className={styles.head}>
              <h3 className={styles.name}>{plan.name}</h3>
              <span className={styles.users}>{plan.users}</span>
            </div>
            <p className={styles.summary}>{plan.summary}</p>
            <div className={styles.price}>
              <span className={styles.priceValue}>90 days free</span>
              <span className={styles.priceNote}>Then a price for your team</span>
            </div>
            <ul className={styles.features}>
              {plan.features.map((feature) => (
                <li key={feature} className={styles.feature}>
                  <Check className={styles.featureIcon} aria-hidden="true" focusable="false" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className={styles.action}>
              <PlanAction plan={plan} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
