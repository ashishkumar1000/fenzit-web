import type { ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonProps = {
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
  /** Large buttons carry the primary action of a form (56px touch height). Compact fits a table cell. */
  size?: "regular" | "large" | "compact";
  disabled?: boolean;
  onClick?: () => void;
  /** The id of text that says why the button is disabled, so screen readers hear it. */
  describedBy?: string;
  /** Moves focus here when the element mounts — the confirm stage of a flow. */
  autoFocus?: boolean;
  /** Extra classes from the calling component's module (spacing, hit area). */
  className?: string;
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
  autoFocus = false,
  className,
  children,
}: ButtonProps) {
  const variantClass = variant === "primary" ? styles.primary : styles.secondary;
  const sizeClass = size === "large" ? styles.large : size === "compact" ? styles.compact : "";
  return (
    <button
      type={type}
      className={`${styles.base} ${variantClass} ${sizeClass}${className === undefined ? "" : ` ${className}`}`}
      disabled={disabled}
      onClick={onClick}
      aria-describedby={describedBy}
      autoFocus={autoFocus}
    >
      {children}
    </button>
  );
}
