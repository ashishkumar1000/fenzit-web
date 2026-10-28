import { useId, useState } from "react";
import { SLIDER } from "../pricingContent";
import { hoursSavedPerMonth, tierForMembers } from "../savings";
import styles from "./SavingsCalculator.module.css";

/** A mock estimate: move the slider to see the admin hours and plan for a team size. */
export function SavingsCalculator() {
  const [members, setMembers] = useState<number>(SLIDER.initial);
  const sliderId = useId();
  const valueId = useId();

  return (
    <section className={styles.section} aria-labelledby="savings-title">
      <div className={styles.layout}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Estimate your savings</p>
          <h2 id="savings-title" className={styles.title}>
            See your team savings
          </h2>
          <p className={styles.text}>See how much time and fuel you could save.</p>
          <div className={styles.sliderHead}>
            <label htmlFor={sliderId} className={styles.sliderLabel}>
              Field staff
            </label>
            <span id={valueId} className={styles.sliderValue}>
              {members} members
            </span>
          </div>
          <input
            id={sliderId}
            className={styles.slider}
            type="range"
            min={SLIDER.min}
            max={SLIDER.max}
            step={1}
            value={members}
            aria-valuetext={`${members} members`}
            aria-describedby={valueId}
            onChange={(event) => setMembers(Number(event.target.value))}
          />
          <div className={styles.ticks} aria-hidden="true">
            {SLIDER.ticks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
        </div>

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Trial cost (day 1 to 90)</dt>
            <dd className={styles.statValue}>$0</dd>
            <dd className={styles.statNote}>Free during the trial</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Office hours saved</dt>
            <dd className={styles.statValue}>{hoursSavedPerMonth(members)} hrs/mo</dd>
            <dd className={styles.statNote}>Timesheets made for you</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Fuel saved</dt>
            <dd className={styles.statValue}>18.4%</dd>
            <dd className={styles.statNote}>On the starter plan</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Plan for your team</dt>
            <dd className={styles.statValue}>{tierForMembers(members)}</dd>
            <dd className={styles.statNote}>We send a quote before day 90</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
