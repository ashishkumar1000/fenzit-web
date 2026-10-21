import type { ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonProps = {
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

/** The one button style for the web app. A screen composes it; it does not draw its own. */
export function Button({
  type = "button",
  variant = "primary",
  disabled = false,
  onClick,
  children,
}: ButtonProps) {
  const variantClass = variant === "primary" ? styles.primary : styles.secondary;
  return (
    <button
      type={type}
      className={`${styles.base} ${variantClass}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
