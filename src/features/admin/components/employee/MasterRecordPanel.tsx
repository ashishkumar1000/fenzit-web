import type { EmploymentView } from "../../payrollViews";
import { sectionForMasterField, type EmploymentSection } from "../../employmentSections";
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
  /** Opens the editor on the section holding the clicked field — the banner
   *  lands on its first missing field, an Add link on its own. */
  openEmployment: (section?: EmploymentSection) => void;
}) {
  const missingStatutory = employment.ok
    ? MASTER_RECORD_FIELDS.filter(
        (f) => STATUTORY_KEYS.has(f.key) && isEmpty(employment.data[f.key as keyof EmploymentView]),
      )
    : [];
  const setupDone = employment.ok && missingStatutory.length === 0;

  return (
    <div className={styles.stack}>
      <SectionCard title="Employee Details" meta="Personal, bank and salary-related details.">
        {employment.ok ? (
          <>
            {!setupDone ? (
              <div className={styles.banner} role="status">
                <p>
                  Some details are missing. Please add the following information:{" "}
                  {missingStatutory.map((f) => f.label).join(", ")}
                </p>
                <button
                  type="button"
                  className={styles.bannerAction}
                  onClick={() => openEmployment(sectionForMasterField(missingStatutory[0]?.key))}
                >
                  Complete Employee Details
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
                        <button
                          type="button"
                          className={styles.addButton}
                          onClick={() => openEmployment(sectionForMasterField(field.key))}
                        >
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
            We could not load the employee details.{" "}
            <button type="button" className={styles.retryLink} onClick={() => openEmployment()}>
              Open Anyway
            </button>
          </p>
        )}
      </SectionCard>
      <SectionCard
        title="Skills and Certificates"
        meta="These details help the system find the right employee for each job."
      >
        {skills.length === 0 ? (
          <p className={styles.empty}>
            No skills added yet. The employee can add their skills from their app.
          </p>
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
