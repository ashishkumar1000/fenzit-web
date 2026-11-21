import type { EmploymentView } from "../../payrollViews";
import type { Slice } from "../../slice";
import { SectionCard } from "../SectionCard";
import { MASTER_RECORD_FIELDS } from "../../employeeProfileLabels";
import styles from "./MasterRecordPanel.module.css";

/**
 * The profile's Master Record tab: the statutory grid (every field honest —
 * a filled value or an "Add" affordance into the same employment dialog the
 * list uses), the EPF setup banner while the filing fields are incomplete,
 * and the person's skills (read-only — the member edits their own).
 */

const STATUTORY_KEYS = new Set(MASTER_RECORD_FIELDS.filter((f) => f.statutory).map((f) => f.key));

export function MasterRecordPanel({
  employment,
  skills,
  openEmployment,
}: {
  employment: Slice<EmploymentView>;
  skills: Array<{ id: string; name: string }>;
  openEmployment: () => void;
}) {
  const missingStatutory = employment.ok
    ? MASTER_RECORD_FIELDS.filter(
        (f) => STATUTORY_KEYS.has(f.key) && isEmpty(employment.data[f.key as keyof EmploymentView]),
      )
    : [];
  const setupDone = employment.ok && missingStatutory.length === 0;

  return (
    <div className={styles.stack}>
      <SectionCard title="Workforce master record" meta="Legal and payroll identifiers">
        {employment.ok ? (
          <>
            {!setupDone ? (
              <div className={styles.banner} role="status">
                <p>
                  Statutory profile incomplete for automated EPF filing —{" "}
                  {missingStatutory.map((f) => f.label).join(", ")} still missing.
                </p>
                <button type="button" className={styles.bannerAction} onClick={openEmployment}>
                  Complete master setup
                </button>
              </div>
            ) : null}
            <dl className={styles.grid}>
              {MASTER_RECORD_FIELDS.map((field) => {
                const value = employment.data[field.key as keyof EmploymentView];
                return (
                  <div key={field.key} className={styles.field}>
                    <dt className={styles.label}>{field.label}</dt>
                    <dd className={styles.value}>
                      {isEmpty(value) ? (
                        <button type="button" className={styles.addButton} onClick={openEmployment}>
                          + Add
                        </button>
                      ) : (
                        String(value)
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </>
        ) : (
          <p className={styles.failed} role="alert">
            The employment record could not load.{" "}
            <button type="button" className={styles.retryLink} onClick={openEmployment}>
              Open it anyway
            </button>
          </p>
        )}
      </SectionCard>
      <SectionCard title="Skills & certifications" meta="Job dispatch matches on these">
        {skills.length === 0 ? (
          <p className={styles.empty}>No skills yet — the employee picks them in their app.</p>
        ) : (
          <ul className={styles.skills}>
            {skills.map((skill) => (
              <li key={skill.id} className={styles.skill}>
                {skill.name}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

/** Every employment field is `string | null` — absent renders as Add. */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}
