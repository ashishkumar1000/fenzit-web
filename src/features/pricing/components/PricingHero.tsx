import { PERKS } from "../pricingContent";
import styles from "./PricingHero.module.css";

/** The page title, the trial promise, and the four perks under it. */
export function PricingHero() {
  return (
    <section className={styles.hero} aria-labelledby="pricing-title">
      <h1 id="pricing-title" className={styles.title}>
        Pricing
      </h1>
      <p className={styles.lead}>Every team gets 90 days free to try Fenzit.</p>
      <p className={styles.sub}>Try every feature with no risk. No credit card needed to start.</p>
      <ul className={styles.perks}>
        {PERKS.map((perk) => (
          <li key={perk.key} className={styles.perk}>
            <perk.icon className={styles.perkIcon} aria-hidden="true" focusable="false" />
            <span className={styles.perkTitle}>{perk.title}</span>
            <span className={styles.perkDetail}>{perk.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
