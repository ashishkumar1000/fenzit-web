import type { ReactNode } from "react";
import styles from "./SectionCard.module.css";

type SectionCardProps = {
  title: string;
  /** Small right-aligned line, e.g. "2 of 11" or a raw identifier. */
  meta?: string | null;
  children: ReactNode;
  /** Footer line, e.g. "and 12 more". */
  footer?: ReactNode;
};

/** One dataset of the dossier as a card: a titled block with a dense body.
 *  Cards rise in with a stagger; reduced-motion users get them instantly. */
export function SectionCard({ title, meta, children, footer }: SectionCardProps) {
  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h3 className={styles.title}>{title}</h3>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </header>
      <div className={styles.body}>{children}</div>
      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </section>
  );
}
