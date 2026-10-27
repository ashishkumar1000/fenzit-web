import { useState } from "react";
import { Form } from "react-router";
import { Button } from "../../../components/ui/Button";
import { TextInput } from "../../../components/ui/TextInput";
import { GlyphSearch } from "./glyphs";
import styles from "./SearchForm.module.css";

type SearchFormProps = {
  /** Where the GET navigation goes, e.g. "/admin/inspect". */
  action: string;
  defaultValue?: string;
  busy?: boolean;
};

/**
 * The exact-phone search. A router `<Form method="get">`, so the phone is
 * URL state and the loader owns the lookup — submitting is a client-side
 * navigation, not a fetch and not a full document reload. Callers key this
 * component by the current phone so back/forward keeps the input in step.
 */
export function SearchForm({ action, defaultValue = "", busy = false }: SearchFormProps) {
  const [phone, setPhone] = useState(defaultValue);
  return (
    <Form method="get" action={action} className={styles.form} role="search">
      <div className={styles.field}>
        <TextInput
          id="phone"
          name="phone"
          label="Phone number"
          value={phone}
          onChange={setPhone}
          type="tel"
          inputMode="tel"
          placeholder="98765 43210"
          autoComplete="off"
          hint="10-digit Indian number, with optional 91 or +91"
          maxLength={18}
        />
      </div>
      <div className={styles.submit}>
        <Button type="submit" disabled={busy}>
          {busy ? "Searching…" : "Search"}
        </Button>
        <span className={styles.icon} aria-hidden="true">
          <GlyphSearch />
        </span>
      </div>
    </Form>
  );
}
