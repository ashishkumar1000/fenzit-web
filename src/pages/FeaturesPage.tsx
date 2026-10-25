import { FEATURES_PAGE } from "../app/pageMeta";
import { Container } from "../components/ui/Container";
import { SectionHeading } from "../components/ui/SectionHeading";
import { Footer } from "../features/landing/components/Footer";
import { Header } from "../features/landing/components/Header";
import styles from "./FeaturesPage.module.css";

type FeatureGroup = {
  key: string;
  title: string;
  items: string[];
};

// Every line here is in the app today. Anything not built goes in NOT_YET.
const GROUPS: FeatureGroup[] = [
  {
    key: "owners",
    title: "For owners",
    items: [
      "Create a job from a skill, a customer and one or more employees.",
      "See the job list and each job's details, with live status.",
      "Save customers, with address search and a map pin.",
      "Open directions to a customer's address in one tap.",
      "Invite employees and see their skills.",
      "Get live notifications, with a link to the job.",
      "Get PDF reports for jobs and attendance.",
      "Turn on attendance, with office locations, working hours, weekly offs and holidays.",
      "See who is in today on a live daily dashboard.",
      "See a monthly attendance report for each person.",
      "Correct a day's attendance, with a record of the change.",
      "Approve, revoke or apply for leave, including on someone's behalf.",
    ],
  },
  {
    key: "employees",
    title: "For employees",
    items: [
      "See today's jobs and the steps for each one.",
      "Record location at the steps that need it.",
      "Add photos and the customer's signature.",
      "Check in and out, and see your own month.",
      "Apply for leave, and see your leave history.",
    ],
  },
  {
    key: "platform",
    title: "Platform",
    items: [
      "Sign in with your phone number and a one-time code.",
      "Updates appear live.",
      "Each company sees only its own jobs, attendance, people and reports.",
    ],
  },
];

const NOT_YET: string[] = [
  "Working offline. Employees need a mobile connection to update a job.",
  "Invoices and payments.",
  "A customer portal.",
  "Accounting sync.",
  "Trip distance reports.",
];

export function FeaturesPage() {
  return (
    <div className={styles.page}>
      <title>{FEATURES_PAGE.title}</title>
      <Header />
      <main className={styles.main}>
        <section className={styles.section} aria-labelledby="features-page-title">
          <Container>
            <h1 id="features-page-title" className={styles.title}>
              Everything Fenzit does today
            </h1>
            <p className={styles.lead}>
              Jobs, attendance and leave. Use any one of them on its own, or several together.
            </p>
            {GROUPS.map((group) => (
              <section
                key={group.key}
                className={styles.group}
                aria-labelledby={`${group.key}-title`}
              >
                <SectionHeading id={`${group.key}-title`} title={group.title} />
                <ul className={styles.list}>
                  {group.items.map((item) => (
                    <li key={item} className={styles.item}>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <section className={styles.group} aria-labelledby="not-yet-title">
              <SectionHeading id="not-yet-title" title="Not in the app yet" />
              <ul className={styles.list}>
                {NOT_YET.map((item) => (
                  <li key={item} className={styles.item}>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
