import type { ReactNode } from "react";
import styles from "./HeroPanel.module.css";

export type Tone = "done" | "progress" | "scheduled" | "leave" | "neutral";

const PILL_TONE: Record<Tone, string> = {
  done: styles.toneDone,
  progress: styles.toneProgress,
  scheduled: styles.toneScheduled,
  leave: styles.toneLeave,
  neutral: styles.toneNeutral,
};

const DOT_TONE: Record<Tone, string> = {
  done: styles.dotDone,
  progress: styles.dotProgress,
  scheduled: styles.dotScheduled,
  leave: styles.dotProgress,
  neutral: styles.dotNeutral,
};

type StatusPillProps = {
  tone: Tone;
  /** Shows a coloured dot before the label. */
  dot?: boolean;
  children: ReactNode;
};

/** A status pill. The label always carries the meaning; colour only backs it up. */
export function StatusPill({ tone, dot = false, children }: StatusPillProps) {
  return (
    <span className={`${styles.pill} ${PILL_TONE[tone]}`}>
      {dot ? <span className={`${styles.dot} ${DOT_TONE[tone]}`} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

type HeroPanelProps = {
  title: string;
  icon: ReactNode;
  pill?: ReactNode;
  children: ReactNode;
};

/** The frame shared by both hero panels: a header with the title, then the body. */
export function HeroPanel({ title, icon, pill, children }: HeroPanelProps) {
  return (
    <article className={styles.panel} aria-label={title}>
      <header className={styles.header}>
        <span className={styles.iconChip}>{icon}</span>
        {/* A paragraph, not a heading: these panels are a decorative mockup, and two more h2s
            here would sit in the page outline between the hero h1 and the first real section. */}
        <p className={styles.title}>{title}</p>
        {pill}
      </header>
      {children}
    </article>
  );
}
