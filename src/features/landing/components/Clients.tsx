import { Container } from "../../../components/ui/Container";
import { ClientMark, type ClientSlug } from "./ClientMarks";
import styles from "./Clients.module.css";

type ClientEntry = {
  slug: ClientSlug;
  name: string;
  city: string;
};

const CLIENTS: ClientEntry[] = [
  { slug: "surya-college", name: "Surya College", city: "Chhattisgarh" },
  { slug: "raj-electronics", name: "Raj Electronics", city: "Bihar" },
  { slug: "crown-international", name: "Crown International", city: "Hyderabad" },
  { slug: "surya-international-school", name: "Surya International School", city: "Jagdalpur" },
  { slug: "master-mind", name: "Master Mind", city: "Jharkhand" },
  { slug: "pearl", name: "Pearl", city: "New Delhi" },
  { slug: "aircool", name: "Aircool Airconditioners", city: "New Delhi" },
  { slug: "fem-pharma", name: "Fem Pharma", city: "New Delhi" },
  { slug: "zuba-spirits", name: "Zuba Spirits", city: "Mumbai" },
];

function ClientSet({ hidden }: { hidden: boolean }) {
  return (
    <ul className={styles.set} aria-hidden={hidden || undefined}>
      {CLIENTS.map((client) => (
        <li key={client.slug} className={styles.card}>
          <span className={styles.mark}>
            <ClientMark slug={client.slug} />
          </span>
          <span className={styles.name}>{client.name}</span>
          <span className={styles.city}>{client.city}</span>
        </li>
      ))}
    </ul>
  );
}

/** Social-proof strip under the hero: client cards on a slow marquee.
 * Owns its centred heading because the shared SectionHeading is left-aligned. */
export function Clients() {
  return (
    <section id="clients" className={styles.section} aria-labelledby="clients-title">
      <Container>
        <div className={styles.head}>
          <h2 id="clients-title" className={styles.title}>
            Trusted by growing businesses
          </h2>
          <p className={styles.lead}>
            From regional workshops to nationwide operations, companies rely on Fenzit for real-time
            field operations.
          </p>
        </div>
        <div className={styles.marquee}>
          <div className={styles.track}>
            <ClientSet hidden={false} />
            <ClientSet hidden={true} />
          </div>
        </div>
      </Container>
    </section>
  );
}
