import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import styles from "./CountryFlag.module.css";
import { FLAG_LOADERS } from "./flagLoaders";

// Each flag is its own chunk, so only the chosen flag downloads. The React flag package bundles
// every flag into one chunk, which put about 50 KB on the first load. Creating a lazy component
// downloads nothing, so every flag component is made once here, at load time.
const FLAGS: Record<string, LazyExoticComponent<ComponentType>> = {};
for (const [iso2, load] of Object.entries(FLAG_LOADERS)) {
  if (load === undefined) continue;
  FLAGS[iso2] = lazy(async (): Promise<{ default: ComponentType }> => {
    // A flag that cannot load (offline, or a stale deploy) shows no flag. It must not throw, or
    // the error reaches the route and blanks the page.
    let svg: string;
    try {
      ({ default: svg } = await load());
    } catch {
      return { default: () => null };
    }
    // The markup comes from the flag package's own file, for a code checked against the list above.
    // It is not user input. The size attributes make the SVG fill the flag box.
    const sized = svg.replace("<svg ", '<svg width="100%" height="100%" focusable="false" ');
    return {
      default: () => <span className={styles.svg} dangerouslySetInnerHTML={{ __html: sized }} />,
    };
  });
}

type CountryFlagProps = {
  iso2: string | undefined;
};

/** The flag for the chosen country code. Decorative: the select next to it names the country. */
export function CountryFlag({ iso2 }: CountryFlagProps) {
  const Flag = iso2 && /^[A-Z]{2}$/.test(iso2) ? FLAGS[iso2] : undefined;
  if (Flag === undefined) return null;
  return (
    <span className={styles.flag} aria-hidden="true">
      <Suspense fallback={null}>
        <Flag />
      </Suspense>
    </span>
  );
}
