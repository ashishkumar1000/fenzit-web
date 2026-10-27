import type { ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonProps = {
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
  /** Large buttons carry the primary action of a form (56px touch height). */
  size?: "regular" | "large";
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
  size = "regular",
  disabled = false,
  onClick,
  describedBy,
  children,
}: ButtonProps) {
  const variantClass = variant === "primary" ? styles.primary : styles.secondary;
  const sizeClass = size === "large" ? styles.large : "";
  return (
    <button
      type={type}
      className={`${styles.base} ${variantClass} ${sizeClass}`}
      disabled={disabled}
      onClick={onClick}
      aria-describedby={describedBy}
    >
      {children}
    </button>
  );
}
