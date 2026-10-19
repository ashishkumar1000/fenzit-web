import type { ComponentType, SVGProps } from "react";
import * as Flags from "country-flag-icons/react/3x2";
import styles from "./CountryFlag.module.css";

type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>;

// Keyed by ISO 3166-1 alpha-2 code, such as "IN". Built once, outside render.
const FLAG_BY_CODE = Flags as unknown as Record<string, FlagComponent | undefined>;

type CountryFlagProps = {
  iso2: string | undefined;
};

/** The flag for the chosen country code. Decorative: the select next to it names the country. */
export function CountryFlag({ iso2 }: CountryFlagProps) {
  const Flag = iso2 && /^[A-Z]{2}$/.test(iso2) ? FLAG_BY_CODE[iso2] : undefined;
  if (Flag === undefined) return null;
  return (
    <span className={styles.flag} aria-hidden="true">
      <Flag className={styles.svg} focusable="false" />
    </span>
  );
}
