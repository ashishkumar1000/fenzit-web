import type { ReactNode } from "react";
import { Info } from "lucide-react";
import styles from "./TextInput.module.css";

type TextInputProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "email" | "tel";
  inputMode?: "text" | "tel" | "numeric" | "email";
  autoComplete?: string;
  placeholder?: string;
  /** Content drawn inside the field before the text, such as a country code choice. */
  prefix?: ReactNode;
  /** Content drawn inside the field after the text, at its right edge, such as a show/hide button. */
  trailing?: ReactNode;
  hint?: string;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
};

/**
 * A labelled text field. The label is always visible (never placeholder only).
 * Hint and error text are linked to the input for screen readers.
 */
export function TextInput({
  id,
  name,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  prefix,
  trailing,
  hint,
  error,
  disabled = false,
  maxLength,
}: TextInputProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter((part): part is string => part !== null)
    .join(" ");

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={prefix ? `${styles.control} ${styles.boxed}` : styles.control}>
        {prefix}
        <input
          id={id}
          name={name}
          className={[
            prefix ? styles.inBox : null,
            trailing ? styles.withTrailing : null,
            styles.input,
          ]
            .filter((name) => name !== null)
            .join(" ")}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy === "" ? undefined : describedBy}
        />
        {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          <Info className={styles.hintIcon} size={16} strokeWidth={2} aria-hidden="true" />
          <span>{hint}</span>
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
