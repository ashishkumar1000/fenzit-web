import type { ReactNode } from "react";
import styles from "./Container.module.css";

type ContainerProps = {
  children: ReactNode;
};

/** Centres page content and applies the gutters from the design tokens. */
export function Container({ children }: ContainerProps) {
  return <div className={styles.container}>{children}</div>;
}
