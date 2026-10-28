import { ChevronDown } from "lucide-react";
import type { CountryCode } from "../../services/countryCodes";
import { CountryFlag } from "./CountryFlag";
import styles from "./DialCodeSelect.module.css";

type DialCodeSelectProps = {
  id: string;
  name: string;
  countries: CountryCode[];
  value: string;
  onChange: (dialCode: string) => void;
  disabled?: boolean;
  /** Compact shows the ISO code and the dial code (for example "US +1") — for
   *  search fields that sit next to a labelled input. Several countries share
   *  a dial code, so the ISO code tells them apart. Each option's native
   *  tooltip carries the full country name in both modes. */
  compact?: boolean;
};

function countryLabel(country: CountryCode): string {
  return `${country.countryName} (${country.dialCode})`;
}

/**
 * The country code choice beside a phone number: a flag, the country and its dial code.
 * It posts its value under `name`. The same control the home page uses for its phone field.
 */
export function DialCodeSelect({
  id,
  name,
  countries,
  value,
  onChange,
  disabled = false,
  compact = false,
}: DialCodeSelectProps) {
  const selected = countries.find((country) => country.dialCode === value);
  const labelFor = (country: CountryCode): string =>
    compact ? `${country.iso2} ${country.dialCode}` : countryLabel(country);
  return (
    <span className={styles.dialField}>
      <label htmlFor={id} className={styles.visuallyHidden}>
        Country code
      </label>
      <span className={styles.selectSizer}>
        <CountryFlag iso2={selected?.iso2} />
        <select
          id={id}
          name={name}
          className={styles.dialSelect}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        >
          {countries.map((country) => (
            <option
              key={`${country.iso2}-${country.dialCode}`}
              value={country.dialCode}
              title={countryLabel(country)}
            >
              {labelFor(country)}
            </option>
          ))}
        </select>
        {/* Same text as the chosen option, so the select is only as wide as its choice. */}
        <span className={styles.sizer} aria-hidden="true">
          {selected ? labelFor(selected) : value}
        </span>
        <ChevronDown className={styles.dialChevron} aria-hidden="true" focusable="false" />
      </span>
    </span>
  );
}
