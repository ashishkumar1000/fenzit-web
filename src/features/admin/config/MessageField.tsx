import { MESSAGE_MAX } from "./configRules";
import styles from "./MessageField.module.css";

interface MessageFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** A labelled textarea with a live count. The count and any error are linked for screen readers. */
export function MessageField({ id, name, label, value, onChange, error }: MessageFieldProps) {
  const countId = `${id}-count`;
  const errorId = `${id}-error`;
  const describedBy = [countId, error ? errorId : null]
    .filter((part): part is string => part !== null)
    .join(" ");

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        className={styles.textarea}
        rows={3}
        value={value}
        maxLength={MESSAGE_MAX}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      <p id={countId} className={styles.count}>
        {value.length} of {MESSAGE_MAX} characters
      </p>
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
