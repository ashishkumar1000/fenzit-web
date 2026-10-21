import type { ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonProps = {
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick?: () => void;
  /** The id of text that says why the button is disabled, so screen readers hear it. */
  describedBy?: string;
  children: ReactNode;
};

/** The one button style for the web app. A screen composes it; it does not draw its own. */
export function Button({
  type = "button",
  variant = "primary",
  disabled = false,
  onClick,
  describedBy,
  children,
}: ButtonProps) {
  const variantClass = variant === "primary" ? styles.primary : styles.secondary;
  return (
    <button
      type={type}
      className={`${styles.base} ${variantClass}`}
      disabled={disabled}
      onClick={onClick}
      aria-describedby={describedBy}
    >
      {children}
    </button>
  );
}
