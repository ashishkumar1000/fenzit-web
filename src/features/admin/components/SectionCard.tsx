import type { ReactNode } from "react";
import styles from "./SectionCard.module.css";

type SectionCardProps = {
  title: string;
  /** One quiet line under the title, for a card whose body needs framing. */
  subtitle?: string;
  /** A small tinted icon tile beside the title, when the card stands alone
   *  as a page section rather than a dataset in a dossier. */
  icon?: ReactNode;
  /** Small right-aligned line, e.g. "2 of 11" — usually text, but a header
   *  may carry a status badge with it. */
  meta?: ReactNode;
  /** The card's heading level: 3 inside a dossier, 2 when the card IS the
   *  page's section (Help), so the outline never skips a level. */
  headingLevel?: 2 | 3;
  children: ReactNode;
  /** Footer line, e.g. "and 12 more". */
  footer?: ReactNode;
};

/** One dataset of the dossier as a card: a titled block with a dense body.
 *  Cards rise in with a stagger; reduced-motion users get them instantly. */
export function SectionCard({
  title,
  subtitle,
  icon,
  meta,
  headingLevel = 3,
  children,
  footer,
}: SectionCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className={styles.card}>
      <header className={styles.head}>
        {icon !== undefined ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className={styles.headText}>
          <Heading className={styles.title}>{title}</Heading>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </header>
      <div className={styles.body}>{children}</div>
      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </section>
  );
}
