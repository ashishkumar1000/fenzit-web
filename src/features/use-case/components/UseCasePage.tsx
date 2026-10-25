import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import type { PageMeta } from "../../../app/pageMeta";
import { LinkButton } from "../../../components/ui/LinkButton";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import { Footer } from "../../landing/components/Footer";
import { Header } from "../../landing/components/Header";
import styles from "./UseCasePage.module.css";

export type UseCaseStep = {
  key: string;
  icon: LucideIcon;
  title: string;
  text: string;
};

export type UseCaseFaq = {
  key: string;
  question: string;
  answer: string;
};

export type UseCaseSibling = {
  to: string;
  label: string;
};

export type UseCaseContent = {
  meta: PageMeta;
  /** The hand-drawn scene for this business type. Decorative; the component hides it. */
  art: ComponentType;
  heading: string;
  lead: string;
  problemHeading: string;
  problem: string[];
  stepsHeading: string;
  steps: UseCaseStep[];
  faq: UseCaseFaq[];
  siblings: UseCaseSibling[];
};

/**
 * The shared shape of a use-case page: hero with art, the problem, how it works, questions, and
 * the early-access call to action with links to the other pages. The content differs per page;
 * this component keeps the structure, spacing and links identical.
 */
export function UseCasePage({ content }: { content: UseCaseContent }) {
  const Art = content.art;
  return (
    <div className={styles.page}>
      <title>{content.meta.title}</title>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="use-case-title">
          <Container>
            <Link className={styles.back} to="/">
              Back to home
            </Link>
            <div className={styles.heroGrid}>
              <div>
                <h1 id="use-case-title" className={styles.title}>
                  {content.heading}
                </h1>
                <p className={styles.lead}>{content.lead}</p>
                <LinkButton to="/" variant="primary">
                  Join the early access list
                </LinkButton>
              </div>
              <div className={styles.artPanel}>
                <Art />
              </div>
            </div>
          </Container>
        </section>

        <section className={styles.section} aria-labelledby="problem-heading">
          <Container>
            <SectionHeading id="problem-heading" title={content.problemHeading} />
            <ul className={styles.points}>
              {content.problem.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Container>
        </section>

        <section className={styles.section} aria-labelledby="steps-heading">
          <Container>
            <SectionHeading id="steps-heading" title={content.stepsHeading} />
            <ol className={styles.steps}>
              {content.steps.map((step) => (
                <li key={step.key} className={styles.step}>
                  <span className={styles.stepIcon}>
                    <step.icon aria-hidden="true" focusable="false" />
                  </span>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.text}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        <section className={styles.section} aria-labelledby="faq-heading">
          <Container>
            <SectionHeading id="faq-heading" title="Questions" />
            <div className={styles.faqList}>
              {content.faq.map((item) => (
                <details key={item.key} className={styles.faqItem}>
                  <summary className={styles.faqSummary}>{item.question}</summary>
                  <p className={styles.faqAnswer}>{item.answer}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        <section className={styles.cta} aria-labelledby="cta-heading">
          <Container>
            <h2 id="cta-heading" className={styles.ctaTitle}>
              See it working for your team
            </h2>
            <p className={styles.ctaText}>
              Join the early access list, and we will email you as access opens.
            </p>
            <LinkButton to="/" variant="primary">
              Join the early access list
            </LinkButton>
            <p className={styles.ctaMore}>Fenzit also helps:</p>
            <ul className={styles.siblings}>
              {content.siblings.map((sibling) => (
                <li key={sibling.to}>
                  <Link className={styles.siblingLink} to={sibling.to}>
                    {sibling.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
