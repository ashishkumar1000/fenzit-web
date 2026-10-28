import { PRICING_PAGE } from "../app/pageMeta";
import { Container } from "../components/ui/Container";
import { AfterTrial } from "../features/pricing/components/AfterTrial";
import { PlanCards } from "../features/pricing/components/PlanCards";
import { PricingFaq } from "../features/pricing/components/PricingFaq";
import { PricingHero } from "../features/pricing/components/PricingHero";
import { SavingsCalculator } from "../features/pricing/components/SavingsCalculator";
import { TrialOverview } from "../features/pricing/components/TrialOverview";
import { TrialSteps } from "../features/pricing/components/TrialSteps";
import { Footer } from "../features/landing/components/Footer";
import { Header } from "../features/landing/components/Header";
import styles from "./PricingPage.module.css";

/** The public pricing page. The header and footer are the shared ones; the body is the pricing design. */
export function PricingPage() {
  return (
    <div className={styles.page}>
      <title>{PRICING_PAGE.title}</title>
      <Header />
      <main className={styles.main}>
        <Container>
          <PricingHero />
          <TrialOverview />
          <TrialSteps />
          <SavingsCalculator />
          <PlanCards />
          <AfterTrial />
          <PricingFaq />
        </Container>
      </main>
      <Footer />
    </div>
  );
}
