import type { ReactNode } from "react";
import { Link } from "react-router";
import styles from "./LinkButton.module.css";

type LinkButtonTarget = { href: string; to?: never } | { to: string; href?: never };

type LinkButtonProps = LinkButtonTarget & {
  variant: "primary" | "secondary";
  children: ReactNode;
};

/**
 * A link that looks like a button. Use `href` for a jump within the page, which is a plain
 * link and works without JavaScript. Use `to` for a route in this app, which moves inside the
 * app without reloading the page.
 */
export function LinkButton({ href, to, variant, children }: LinkButtonProps) {
  const className = `${styles.base} ${variant === "primary" ? styles.primary : styles.secondary}`;
  if (to !== undefined) {
    return (
      <Link className={className} to={to}>
        {children}
      </Link>
    );
  }
  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}
