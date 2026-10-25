import { useId, type ComponentType } from "react";
import { CircleCheck } from "lucide-react";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import { EmployeeArt, OwnerArt } from "./AudienceArt";
import styles from "./Audience.module.css";

type AudienceGroup = {
  key: string;
  Art: ComponentType;
  title: string;
  points: string[];
};

const GROUPS: AudienceGroup[] = [
  {
    key: "owners",
    Art: OwnerArt,
    title: "For owners",
    points: [
      "Create jobs and assign the right skill and team.",
      "Turn on attendance, set office locations and approve leave.",
      "See live job status, and get PDF reports.",
    ],
  },
  {
    key: "employees",
    Art: EmployeeArt,
    title: "For employees",
    points: [
      "Check in and out, and see your own month.",
      "Apply for leave from your phone.",
      "See today's jobs, and mark each step done with photos and the customer's signature.",
    ],
  },
];

/** The owners/employees split, on a faint drawn texture. */
export function Audience() {
  return (
    <section className={styles.section} aria-labelledby="audience-title">
      <BackgroundPattern />
      <div className={styles.content}>
        <Container>
          <SectionHeading
            id="audience-title"
            title="Built for owners and employees"
            lead="Owners set up jobs and attendance. Your team uses the app on their phones."
          />
          <div className={styles.grid}>
            {GROUPS.map((group) => {
              const Art = group.Art;
              return (
                <article key={group.key} className={styles.card}>
                  <div className={styles.cardHead}>
                    <span className={styles.iconWrap}>
                      <Art />
                    </span>
                    <h3 className={styles.cardTitle}>{group.title}</h3>
                  </div>
                  <ul className={styles.list}>
                    {group.points.map((point) => (
                      <li key={point} className={styles.item}>
                        <CircleCheck
                          className={styles.check}
                          aria-hidden="true"
                          focusable="false"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </Container>
      </div>
    </section>
  );
}

// Faint dot-and-cross texture behind the cards. Purely decorative: the svg is
// aria-hidden and the colours come from tokens in Audience.module.css.
function BackgroundPattern() {
  // useId keeps the pattern reference unique if the section ever renders twice.
  const tileId = useId();
  return (
    <svg className={styles.pattern} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={tileId} width="28" height="28" patternUnits="userSpaceOnUse">
          <circle className={styles.patternDot} cx="7" cy="7" r="1.7" />
          <path className={styles.patternPlus} d="M21 18.4 V23.6 M18.4 21 H23.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${tileId})`} />
    </svg>
  );
}
