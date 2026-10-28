import { ChevronDown } from "lucide-react";
import { PRICING_FAQ } from "../pricingContent";
import { PricingSectionHead } from "./PricingSectionHead";
import styles from "./PricingFaq.module.css";

// Native <details> keeps the answers open and closed without JavaScript. The first answer
// starts open, as in the design.
export function PricingFaq() {
  return (
    <section className={styles.section} aria-labelledby="pricing-faq-title">
      <PricingSectionHead id="pricing-faq-title" title="Frequently asked questions" />
      <div className={styles.list}>
        {PRICING_FAQ.map((entry, index) => (
          <details key={entry.key} className={styles.item} open={index === 0}>
            <summary className={styles.summary}>
              {entry.question}
              <ChevronDown className={styles.chevron} aria-hidden="true" focusable="false" />
            </summary>
            <p className={styles.answer}>{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
