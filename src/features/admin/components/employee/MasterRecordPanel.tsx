import { useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  Clipboard,
  CreditCard,
  Heart,
  Landmark,
  LayoutGrid,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import type { EmploymentView } from "../../payrollViews";
import { sectionForMasterField, type EmploymentSection } from "../../employmentSections";
import type { Slice } from "../../slice";
import { SectionCard } from "../SectionCard";
import { dismissToast, pushToast } from "../../../../components/ui/toastStore";
import { MASTER_RECORD_FIELDS } from "../../employeeProfileLabels";
import { fmtDay } from "../../format";
import styles from "./MasterRecordPanel.module.css";

/**
 * The profile's Master Record tab: the statutory grid (every field honest —
 * a filled value or an "Add" affordance into the same employment dialog the
 * list uses), the EPF setup banner while the filing fields are incomplete,
 * and the person's skills (read-only — the member edits their own).
 *
 * The grid follows the 2026-11-27 Stitch screen: four labelled groups of
 * soft tiles, icon in each label, and a copy control on the identifiers the
 * owner reads out to a bank or a consultant.
 */

const FIELD_ICONS: Record<string, LucideIcon> = {
  dateOfBirth: Calendar,
  fatherName: Users,
  motherName: Users,
  spouseName: Heart,
  pan: CreditCard,
  pfAccountNumber: ShieldCheck,
  uanNumber: AtSign,
  bankName: Landmark,
  ifscCode: LayoutGrid,
  bankAccountNumber: CreditCard,
  department: Building2,
  designation: Briefcase,
  joinDate: CalendarDays,
};

/** The design's four groups, in the same order and with the same fields. */
const GROUPS: Array<{
  caption: string;
  tone: "personal" | "tax" | "bank" | "job";
  keys: string[];
}> = [
  {
    caption: "Personal information",
    tone: "personal",
    keys: ["dateOfBirth", "fatherName", "motherName", "spouseName"],
  },
  { caption: "Tax identifiers", tone: "tax", keys: ["pan", "pfAccountNumber", "uanNumber"] },
  {
    caption: "Bank & payroll details",
    tone: "bank",
    keys: ["bankName", "ifscCode", "bankAccountNumber"],
  },
  {
    caption: "Job & organizational role",
    tone: "job",
    keys: ["department", "designation", "joinDate"],
  },
];

const TONE_CLASS: Record<(typeof GROUPS)[number]["tone"], string> = {
  personal: styles.groupPersonal,
  tax: styles.groupTax,
  bank: styles.groupBank,
  job: styles.groupJob,
};

/** Identifiers the owner copies out — PAN, PF, UAN, IFSC and the account. */
const COPYABLE = new Set(["pan", "pfAccountNumber", "uanNumber", "ifscCode", "bankAccountNumber"]);

/** The last copy confirmation. Reading five identifiers out to a bank is one
 *  errand, not five announcements: a new copy replaces the previous toast
 *  instead of stacking a fourth card over the numbers being read. */
let copyToastId: number | null = null;

function announceCopy(message: string): void {
  if (copyToastId !== null) dismissToast(copyToastId);
  copyToastId = pushToast(message, "success");
}

function announceCopyFailure(): void {
  // A silent failure lets the owner paste last week's PAN into a form.
  pushToast("Could not copy — select the number and copy it.", "error");
}

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
  // The five identifiers one errand needs — PAN, PF, UAN, IFSC, account —
  // copied together, labelled, so the owner does not juggle five taps.
  const copyableFields = employment.ok
    ? MASTER_RECORD_FIELDS.filter(
        (f) => COPYABLE.has(f.key) && !isEmpty(employment.data[f.key as keyof EmploymentView]),
      )
    : [];
  const copyAll = async () => {
    if (!employment.ok) return;
    const lines = copyableFields.map(
      (f) => `${f.label}: ${String(employment.data[f.key as keyof EmploymentView])}`,
    );
    const ok = await writeClipboard(lines.join("\n"));
    if (!ok) {
      announceCopyFailure();
      return;
    }
    announceCopy("Identifiers copied.");
  };

  return (
    <div className={styles.stack}>
      <SectionCard
        title="Employee Details"
        subtitle="Personal records, tax and banking details."
        icon={<UserRound size={17} strokeWidth={1.75} />}
        meta={
          copyableFields.length > 0 ? (
            <button type="button" className={styles.copyAll} onClick={copyAll}>
              Copy identifiers
            </button>
          ) : undefined
        }
      >
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
            <div className={styles.groups}>
              {GROUPS.map((group) => (
                <div key={group.caption} className={styles.group}>
                  <h4 className={`${styles.groupTitle} ${TONE_CLASS[group.tone]}`}>
                    <span className={styles.groupDot} aria-hidden="true" />
                    {group.caption}
                  </h4>
                  <dl className={styles.tiles}>
                    {group.keys.map((key) => {
                      const field = MASTER_RECORD_FIELDS.find((f) => f.key === key);
                      if (field === undefined) return null;
                      const value = employment.data[field.key as keyof EmploymentView];
                      const Icon = FIELD_ICONS[field.key] ?? Clipboard;
                      return (
                        <div key={field.key} className={styles.tile}>
                          <dt className={styles.tileLabel}>
                            <Icon size={14} className={styles.tileIcon} aria-hidden="true" />
                            {field.label}
                          </dt>
                          <dd className={styles.tileValue}>
                            {isEmpty(value) ? (
                              <button
                                type="button"
                                className={styles.addButton}
                                onClick={() => openEmployment(sectionForMasterField(field.key))}
                              >
                                + Add
                              </button>
                            ) : (
                              <span className={styles.valueText}>
                                {displayValue(field.key, value)}
                              </span>
                            )}
                            {!isEmpty(value) && COPYABLE.has(field.key) ? (
                              <CopyButton label={field.label} value={String(value)} />
                            ) : null}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ))}
            </div>
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
      <SectionCard title="Skills and Certificates">
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

/** Copies one identifier. The tick is the only success signal, and it only
 *  shows when the browser actually accepted the write. */
function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async () => {
    const ok = await writeClipboard(value);
    if (!ok) {
      announceCopyFailure();
      return;
    }
    setCopied(true);
    // The tick is local to the tile; the toast survives a scroll away from
    // the field, so the person sees the copy landed wherever they are.
    announceCopy(`${label} copied.`);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      className={styles.copyButton}
      onClick={() => void copy()}
      aria-label={`Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Clipboard size={14} aria-hidden="true" />}
    </button>
  );
}

/** Copies text, falling back to the old selection copy where the async
 *  clipboard is unavailable or refused (an embedded webview, a strict
 *  permissions policy). Returns whether the browser accepted the write, so
 *  the tick never lies. */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the selection copy.
  }
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.readOnly = true;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    try {
      field.select();
      return document.execCommand("copy");
    } finally {
      // A throw from execCommand must not leave an invisible field behind.
      field.remove();
    }
  } catch {
    return false;
  }
}

/** Every employment field is `string | null` — absent renders as Add. */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/** Date fields are YYYY-MM-DD on the wire; the grid shows them the one
 *  read-only way the console formats a day. Everything else renders as is. */
const DATE_FIELDS = new Set(["dateOfBirth", "joinDate"]);

function displayValue(key: string, value: unknown): string {
  if (DATE_FIELDS.has(key) && typeof value === "string") return fmtDay(value);
  return String(value);
}
