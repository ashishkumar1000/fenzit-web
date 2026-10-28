import type { ReactNode } from "react";
import type { PageMeta } from "../app/pageMeta";
import { Container } from "../components/ui/Container";
import { SectionHeading } from "../components/ui/SectionHeading";
import { Footer } from "../features/landing/components/Footer";
import { Header } from "../features/landing/components/Header";
import styles from "./SimplePage.module.css";

type SimplePageProps = {
  meta: PageMeta;
  id: string;
  title: string;
  lead: string;
  children: ReactNode;
};

/** The shared frame for the plain public pages: header, title, content, footer. */
export function SimplePage({ meta, id, title, lead, children }: SimplePageProps) {
  return (
    <div className={styles.page}>
      <title>{meta.title}</title>
      <Header />
      <main className={styles.main}>
        <section className={styles.section} aria-labelledby={id}>
          <Container>
            <div className={styles.column}>
              <h1 id={id} className={styles.title}>
                {title}
              </h1>
              <p className={styles.lead}>{lead}</p>
              {children}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}

type SimpleSectionProps = {
  id: string;
  title: string;
  paragraphs?: string[];
  children?: ReactNode;
};

/** One titled block inside a plain page: a heading, short paragraphs, and anything extra. */
export function SimpleSection({ id, title, paragraphs = [], children }: SimpleSectionProps) {
  return (
    <section className={styles.block} aria-labelledby={id}>
      <SectionHeading id={id} title={title} />
      {paragraphs.map((text) => (
        <p key={text} className={styles.text}>
          {text}
        </p>
      ))}
      {children}
    </section>
  );
}
