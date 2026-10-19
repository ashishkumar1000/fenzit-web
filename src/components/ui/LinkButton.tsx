import type { ReactNode } from "react";
import styles from "./LinkButton.module.css";

type LinkButtonProps = {
  href: string;
  variant: "primary" | "secondary";
  children: ReactNode;
};

/**
 * A link that looks like a button. Use it for jumps within the page and for
 * navigation. It is a real link, so it works without JavaScript.
 */
export function LinkButton({ href, variant, children }: LinkButtonProps) {
  const variantClass = variant === "primary" ? styles.primary : styles.secondary;
  return (
    <a className={`${styles.base} ${variantClass}`} href={href}>
      {children}
    </a>
  );
}
