import styles from "./PricingSectionHead.module.css";

type PricingSectionHeadProps = {
  id: string;
  eyebrow?: string;
  title: string;
  lead?: string;
};

/** The small eyebrow label, title and optional lead that open each pricing section. */
export function PricingSectionHead({ id, eyebrow, title, lead }: PricingSectionHeadProps) {
  return (
    <header className={styles.head}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
    </header>
  );
}
