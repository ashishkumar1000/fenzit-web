import { Link, useLocation } from "react-router";
import { isCompanyId, searchWithCompany } from "../companyContext";
import type { DossierMembership } from "../dossier-types";
import { SectionCard } from "./SectionCard";
import styles from "./CompanyPicker.module.css";

type CompanyPickerProps = {
  memberships: DossierMembership[];
  activeCompanyId: string | null;
};

/**
 * Staff choose which company their next actions apply to. Each choice is a link
 * that sets `?company=` in the lookup URL, so the loader owns it. A membership
 * without a company id shows its name only: it cannot be picked.
 */
export function CompanyPicker({ memberships, activeCompanyId }: CompanyPickerProps) {
  const location = useLocation();
  const active = memberships.find(
    (m) =>
      activeCompanyId !== null &&
      isCompanyId(m.companyId) &&
      m.companyId.toLowerCase() === activeCompanyId,
  );

  return (
    <SectionCard
      title="Select Company to Manage"
      meta={active ? active.company : "No Company Selected"}
    >
      <p className={styles.status} role="status">
        {active
          ? `You are currently managing ${active.company}.`
          : "Please select a company below before making any changes."}
      </p>
      {memberships.length === 0 ? (
        <p className={styles.empty}>This person does not belong to any company.</p>
      ) : (
        <ul className={styles.list}>
          {memberships.map((m, index) => {
            const key = `${m.companyId}-${index}`;
            if (!isCompanyId(m.companyId)) {
              return (
                <li key={key} className={styles.nameOnly}>
                  <span className={styles.name}>{m.company}</span>
                  <span className={styles.hint}>You cannot select this company right now.</span>
                </li>
              );
            }
            const isActive = m.companyId.toLowerCase() === activeCompanyId;
            return (
              <li key={key}>
                <Link
                  to={{
                    pathname: location.pathname,
                    search: searchWithCompany(location.search, m.companyId),
                  }}
                  className={isActive ? `${styles.choice} ${styles.choiceActive}` : styles.choice}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className={styles.name}>{m.company}</span>
                  <span className={styles.hint}>
                    {isActive ? "Selected" : "Select This Company"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {active ? (
        <Link
          to={{ pathname: location.pathname, search: searchWithCompany(location.search, null) }}
          className={styles.clear}
        >
          Stop Managing This Company
        </Link>
      ) : null}
    </SectionCard>
  );
}
