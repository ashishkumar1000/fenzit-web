import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import { PLAY_STORE_URL } from "../../../config/appStores";
import styles from "./Faq.module.css";

type FaqItem = {
  key: string;
  question: string;
  answer: ReactNode;
};

const ITEMS: FaqItem[] = [
  {
    key: "who",
    question: "Who is Fenzit for?",
    answer:
      "Businesses with field teams, such as repair, cleaning and installation, and businesses that track attendance and leave for their staff.",
  },
  {
    key: "attendance-only",
    question: "Can I use only attendance and leave?",
    answer:
      "Yes. Attendance and leave is switched on separately, so you can use it without creating any jobs.",
  },
  {
    key: "offline",
    question: "Does it work offline?",
    answer: "Not yet. Employees need a mobile connection to update a job.",
  },
  {
    key: "install",
    question: "Do employees need to install an app?",
    answer:
      "Yes. Everyone uses the Fenzit Android app from Google Play and signs in with their phone number.",
  },
  {
    key: "get",
    question: "How do I get the app?",
    answer: (
      <>
        Download Fenzit from{" "}
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
          Google Play
        </a>
        , add your team, and every team gets 90 days free.
      </>
    ),
  },
];

// Native <details> keeps the answers working without JavaScript and gives keyboard users the
// expected behaviour for free.
export function Faq() {
  return (
    <section id="faq" className={styles.section} aria-labelledby="faq-title">
      <Container>
        <SectionHeading id="faq-title" title="Questions" />
        <div className={styles.list}>
          {ITEMS.map((item) => (
            <details key={item.key} className={styles.item}>
              <summary className={styles.summary}>
                {item.question}
                <ChevronDown className={styles.chevron} aria-hidden="true" focusable="false" />
              </summary>
              <p className={styles.answer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
