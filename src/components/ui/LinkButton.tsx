import type { ReactNode } from "react";
import { Link } from "react-router";
import styles from "./LinkButton.module.css";

/* `external` pairs with `href` only: an in-app route never opens a new tab. */
type LinkButtonTarget =
  { href: string; to?: never; external?: boolean } | { to: string; href?: never; external?: never };

type LinkButtonProps = LinkButtonTarget & {
  variant: "primary" | "secondary";
  /** Opens the address in a new tab. Only valid with `href` — another site, such as the Play Store. */
  external?: boolean;
  /** Extra classes from the calling component's module (spacing, hit area). */
  className?: string;
  children: ReactNode;
};

/**
 * A link that looks like a button. Use `href` for a jump within the page, which is a plain
 * link and works without JavaScript. Use `to` for a route in this app, which moves inside the
 * app without reloading the page.
 */
export function LinkButton({ href, to, variant, external, className, children }: LinkButtonProps) {
  const base = `${styles.base} ${variant === "primary" ? styles.primary : styles.secondary}`;
  const classNames = className === undefined ? base : `${base} ${className}`;
  if (to !== undefined) {
    return (
      <Link className={classNames} to={to}>
        {children}
      </Link>
    );
  }
  return (
    <a
      className={classNames}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}
