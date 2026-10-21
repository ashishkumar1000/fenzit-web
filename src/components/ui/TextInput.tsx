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
      <input
        id={id}
        name={name}
        className={styles.input}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy === "" ? undefined : describedBy}
      />
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
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
