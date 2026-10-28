import { useState } from "react";
import { Form } from "react-router";
import { Button } from "../../../components/ui/Button";
import { TextInput } from "../../../components/ui/TextInput";
import { DialCodeSelect } from "../../../components/ui/DialCodeSelect";
import { DEFAULT_DIAL_CODE, type CountryCode } from "../../../services/countryCodes";
import styles from "./SearchForm.module.css";

type SearchFormProps = {
  /** Where the GET navigation goes, e.g. "/admin/inspect". */
  action: string;
  countries: CountryCode[];
  /** The raw phone param from the URL, if a search is already shown. */
  defaultValue?: string;
  busy?: boolean;
};

/** Splits a URL phone param back into dial code + local number for the two
 *  fields; a bare number keeps the default dial code. */
function splitForDisplay(
  phone: string,
  countries: CountryCode[],
): { dialCode: string; number: string } {
  const digits = phone.replace(/[\s()+-]/g, "");
  if (digits.startsWith("+") || /^\d{11,15}$/.test(digits)) {
    const withPlus = digits.startsWith("+") ? digits : `+${digits}`;
    const matches = countries
      .map((c) => c.dialCode)
      .filter((d) => withPlus.startsWith(d))
      .sort((a, b) => b.length - a.length);
    for (const code of matches) {
      const rest = withPlus.slice(code.length);
      if (rest.length > 0) return { dialCode: code, number: rest };
    }
  }
  return { dialCode: DEFAULT_DIAL_CODE, number: digits };
}

/**
 * The exact-phone search: dial code, number and the search button on one
 * line from 600px up, with the button stacked under the inputs on phones. A router `<Form method="get">`, so
 * the phone is URL state and the loader owns the lookup — submitting is a
 * client-side navigation, not a fetch and not a full document reload. The dial
 * code and the number travel as two params; the loader joins them.
 */
export function SearchForm({
  action,
  countries,
  defaultValue = "",
  busy = false,
}: SearchFormProps) {
  const initial = splitForDisplay(defaultValue, countries);
  const [dialCode, setDialCode] = useState(initial.dialCode);
  const [number, setNumber] = useState(initial.number);
  return (
    <Form method="get" action={action} className={styles.form} role="search">
      <div className={styles.row}>
        <div className={styles.dial}>
          <DialCodeSelect
            id="dial-code"
            name="dialCode"
            countries={countries}
            value={dialCode}
            onChange={setDialCode}
            disabled={busy}
            compact
          />
        </div>
        <div className={styles.field}>
          <TextInput
            id="phone"
            name="number"
            label="Phone number"
            value={number}
            onChange={setNumber}
            type="tel"
            inputMode="tel"
            placeholder="Numbers only"
            autoComplete="off"
            hint="Pick the country code, then enter the number without it."
            maxLength={14}
            disabled={busy}
          />
        </div>
        <div className={styles.submit}>
          <Button type="submit" size="large" disabled={busy}>
            {busy ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>
      <p className={styles.status} role="status">
        {busy ? "Please wait. The form is locked until the result shows." : ""}
      </p>
    </Form>
  );
}
