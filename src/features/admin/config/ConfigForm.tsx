import { useState, type FormEvent, type ReactNode } from "react";
import { Form } from "react-router";
import { Button } from "../../../components/ui/Button";
import { TextInput } from "../../../components/ui/TextInput";
import { SectionCard } from "../components/SectionCard";
import type { AppRoadblockConfig } from "./configApi";
import { ForceUpdateFields, type ConfigFieldProps } from "./ForceUpdateFields";
import {
  draftFromConfig,
  isDirty,
  validateDraft,
  type ConfigDraft,
  type FieldErrors,
  type FieldKey,
} from "./configRules";
import styles from "./ConfigForm.module.css";

interface ConfigFormProps {
  /** The server's current config. The parent keys this form on it, so a fresh load starts a fresh draft. */
  config: AppRoadblockConfig;
  /** Field errors from the last save attempt. Hidden for a field once the user edits it. */
  serverErrors: FieldErrors;
  saving: boolean;
  /** Plain-English result line, shown just above the save bar. */
  notice: ReactNode;
}

const STATUS_ID = "config-save-status";

/**
 * The editable form. The draft is what the user is typing; it starts from the
 * server's values and resets only when the parent gives a new config. Errors
 * show after the first submit attempt, then update as the user types.
 */
export function ConfigForm({ config, serverErrors, saving, notice }: ConfigFormProps) {
  const [draft, setDraft] = useState<ConfigDraft>(() => draftFromConfig(config));
  const [submitted, setSubmitted] = useState(false);
  const [edited, setEdited] = useState<ReadonlySet<FieldKey>>(() => new Set());

  const clientErrors = validateDraft(draft);
  const errorFor = (key: FieldKey): string | undefined => {
    if (submitted && clientErrors[key] !== undefined) return clientErrors[key];
    return edited.has(key) ? undefined : serverErrors[key];
  };

  const onChange = (key: FieldKey, value: string) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setEdited((previous) => new Set(previous).add(key));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    setSubmitted(true);
    // Stop the send while the screen still has a problem to fix. Keep the
    // edited fields as they are, so a server error on a corrected field stays hidden.
    if (Object.keys(clientErrors).length > 0) {
      event.preventDefault();
      return;
    }
    setEdited(new Set());
  };

  const dirty = isDirty(draft, config);
  const status = saving
    ? "Saving your changes…"
    : dirty
      ? "You have changes that are not saved yet."
      : "No changes to save";
  const fieldProps: ConfigFieldProps = { values: draft, errorFor, onChange };

  return (
    <Form method="put" className={styles.form} noValidate onSubmit={onSubmit}>
      <SectionCard title="Force update">
        <p className={styles.note}>
          An installed app older than the minimum version stops at a full-screen update screen with
          a link to the store.
        </p>
        <ForceUpdateFields {...fieldProps} />
      </SectionCard>

      <SectionCard title="Support contact">
        <p className={styles.note}>
          Users see these on the update and blocked screens, so they know who to contact.
        </p>
        <div className={styles.stack}>
          <TextInput
            id="config-support-email"
            name="support.email"
            label="Support email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={draft["support.email"]}
            onChange={(value) => onChange("support.email", value)}
            error={errorFor("support.email")}
          />
          <TextInput
            id="config-support-phone"
            name="support.phone"
            label="Support phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={draft["support.phone"]}
            onChange={(value) => onChange("support.phone", value)}
            hint="Include the country code, like +91 92792 30451."
            error={errorFor("support.phone")}
          />
        </div>
      </SectionCard>

      {notice}

      <div className={styles.saveBar}>
        <p id={STATUS_ID} className={styles.status}>
          {status}
        </p>
        <div className={styles.saveAction}>
          <Button type="submit" size="large" disabled={!dirty || saving} describedBy={STATUS_ID}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </Form>
  );
}
