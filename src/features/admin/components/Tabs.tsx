import { Link } from "react-router";
import styles from "./Tabs.module.css";

/**
 * A page's tab strip — the sections that used to stack in one long scroll now
 * live one tab each, and a tab change is plain navigation (`?tab=`). The
 * loader reads that same param, so only the active tab's data is fetched;
 * the first tab is the address with no param at all.
 *
 * Rendered as links, not ARIA tabs: each tab is a real address (deep-linkable,
 * refresh-safe), so the browser's own link keyboard behaviour is the right
 * one — the active tab is marked with aria-current like every other
 * navigation switcher in the console.
 */
export function Tabs({
  basePath,
  tabs,
  current,
}: {
  basePath: string;
  /** `badge`, when present, is a small count beside the label — e.g. the
   *  approvals waiting on the Approval tab. */
  tabs: Array<{ value: string; label: string; badge?: string }>;
  /** The active tab's value. */
  current: string;
}) {
  return (
    <nav className={styles.bar} aria-label="Page sections">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          to={tab.value === tabs[0]?.value ? basePath : `${basePath}?tab=${tab.value}`}
          className={tab.value === current ? styles.tabActive : styles.tab}
          aria-current={tab.value === current ? "page" : undefined}
        >
          {tab.label}
          {tab.badge !== undefined ? <span className={styles.badge}>{tab.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
