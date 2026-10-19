import styles from "./SectionHeading.module.css";

type SectionHeadingProps = {
  id: string;
  title: string;
  lead?: string;
};

/** The title and optional lead line that open a page section. */
export function SectionHeading({ id, title, lead }: SectionHeadingProps) {
  return (
    <div className={styles.head}>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
    </div>
  );
}
