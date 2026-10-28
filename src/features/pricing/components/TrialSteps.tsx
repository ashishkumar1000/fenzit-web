import { TRIAL_STEPS } from "../pricingContent";
import { PricingSectionHead } from "./PricingSectionHead";
import styles from "./TrialSteps.module.css";

/** How pricing works after the trial, as three numbered steps. */
export function TrialSteps() {
  return (
    <section className={styles.section} aria-labelledby="steps-title">
      <PricingSectionHead
        id="steps-title"
        title="How pricing works after the trial"
        lead="Our prices are simple. No hidden fees and no lock-in tricks."
      />
      <ol className={styles.list}>
        {TRIAL_STEPS.map((step, index) => (
          <li key={step.key} className={styles.card}>
            <span className={styles.number} aria-hidden="true">
              {index + 1}
            </span>
            <p className={styles.badge}>{step.badge}</p>
            <h3 className={styles.title}>{step.title}</h3>
            <p className={styles.body}>{step.body}</p>
            <p className={styles.footer}>{step.footer}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
