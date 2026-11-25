import { useNavigate } from "react-router";
import { useState } from "react";
import { fmtMoney } from "../../payrollFormat";
import type {
  FormulaNode,
  SalaryComponentView,
  SalaryStructureLineView,
  SalaryStructureView,
} from "../../payrollViews";
import { istToday } from "../../format";
import type { MemberRow } from "../../companyApi";
import { Dropdown } from "../Dropdown";
import { editorFrom, StructureEditorCard, type EditorState } from "./StructureEditor";
import styles from "./StructuresPanel.module.css";

/**
 * The Structures tab: one employee's effective-dated salary revisions and
 * the editor that saves a new one. The newest revision at or before a
 * month's first day governs that month's run. The editor card itself lives
 * in StructureEditor.tsx.
 */

type SliceOf<T> = { ok: true; data: T } | { ok: false };

export function StructuresPanel({
  members,
  employee,
  structures,
  components,
}: {
  members: SliceOf<MemberRow[]>;
  employee: MemberRow | null;
  structures: SliceOf<SalaryStructureView[]>;
  components: SliceOf<SalaryComponentView[]>;
}) {
  const navigate = useNavigate();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const roster = members.ok
    ? members.data.filter((m) => m.role === "employee" && m.status !== "removed")
    : [];
  const library = components.ok ? components.data : [];
  const activeComponents = library.filter((c) => c.active);
  const revisions = structures.ok ? structures.data : [];

  if (!members.ok || !components.ok) {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          {
            "We could not load the salary structures.\nPlease go back to the menu and open this page again."
          }
        </p>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <p className={styles.panelLede}>
          {
            "A salary structure shows how much salary an employee will receive under each salary component.\nYou can create or update an employee's salary structure from a particular date.\nThe latest saved salary structure will be used when calculating that month's salary."
          }
        </p>
        <div className={styles.pickerRow}>
          <Dropdown
            label="Select Employee"
            searchPlaceholder="Search employee…"
            options={roster.map((m) => ({
              value: m.userId,
              label: m.name ?? "No Name",
              meta: m.employeeCode,
            }))}
            value={employee?.userId ?? ""}
            onChange={(value) => {
              setEditor(null);
              navigate(`/admin/company/payroll?tab=structures&employee=${value}`);
            }}
          />
        </div>
        {employee === null ? (
          <p className={styles.empty}>
            {
              "Please select an employee to see their salary details.\nOnce saved, a salary structure will continue to apply until you save a new one."
            }
          </p>
        ) : !structures.ok ? (
          <p className={styles.failed} role="alert">
            {`We could not load the salary details for ${employee.name ?? "This employee"}.\nPlease try again.`}
          </p>
        ) : (
          <>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>
                {employee.name ?? "No Name"} · {employee.employeeCode}
              </h2>
              <button
                type="button"
                className={styles.addButton}
                onClick={() =>
                  setEditor({
                    employeeId: employee.userId,
                    effectiveFrom: istToday(),
                    lines: [],
                  })
                }
              >
                Add Salary Structure
              </button>
            </div>
            {revisions.length === 0 && editor === null ? (
              <p className={styles.empty}>
                {
                  "No salary structure has been added for this employee yet.\nPlease add the first salary structure to start calculating their salary."
                }
              </p>
            ) : null}
            <ul className={styles.revisions}>
              {[...revisions].reverse().map((revision) => (
                <li key={revision.effectiveFrom} className={styles.revision}>
                  <div className={styles.revisionHead}>
                    <span>
                      Starts From{" "}
                      <strong className={styles.revisionDate}>{revision.effectiveFrom}</strong>
                    </span>
                    <button
                      type="button"
                      className={styles.editButton}
                      onClick={() => setEditor(editorFrom(revision, library, employee.userId))}
                    >
                      Edit
                    </button>
                  </div>
                  <RevisionLines revision={revision} library={library} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {employee !== null && editor !== null && editor.employeeId === employee.userId ? (
        <StructureEditorCard
          key={employee.userId}
          editor={editor}
          setEditor={setEditor}
          employeeId={employee.userId}
          employeeName={employee.name ?? "No Name"}
          activeComponents={activeComponents}
          library={library}
        />
      ) : null}
    </div>
  );
}

/** The revision card's line list, with the BE's resolved names and computed
 *  amounts. A structure that no longer evaluates simply shows no computed
 *  value — the stored configuration is still the truth. */
function RevisionLines({
  revision,
  library,
}: {
  revision: SalaryStructureView;
  library: SalaryComponentView[];
}) {
  const names = new Map(library.map((c) => [c.id, c.name] as const));
  return (
    <table className={styles.linesTable}>
      <thead>
        <tr>
          <th scope="col">Salary Component</th>
          <th scope="col">Amount</th>
          <th scope="col">How It Is Calculated</th>
        </tr>
      </thead>
      <tbody>
        {revision.lines.map((line) => (
          <tr key={line.componentId}>
            <td>{line.componentName}</td>
            <td>{lineDescription(line, names)}</td>
            <td className={styles.computedCell}>
              {line.computedAmount !== undefined ? fmtMoney(line.computedAmount) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function lineDescription(line: SalaryStructureLineView, names: Map<string, string>): string {
  if (typeof line.amount === "string") return fmtMoney(line.amount);
  if (line.formula !== undefined && line.formula !== null) {
    return describeFormula(line.formula, names);
  }
  return "—";
}

/** A short plain-English read of an AST — the shapes the builder emits read
 *  naturally; deeper ones (not offered here) degrade to their structure. */
export function describeFormula(node: FormulaNode, names: Map<string, string>): string {
  switch (node.kind) {
    case "component":
      return names.get(node.componentId) ?? "a component";
    case "const":
      return fmtMoney(node.value.toFixed(2));
    case "percent-of":
      return `${trimPercent(node.percent)}% of ${describeFormula(node.of, names)}`;
    case "binary":
      return `${describeFormula(node.left, names)} ${node.op} ${describeFormula(node.right, names)}`;
    default:
      return "—";
  }
}

function trimPercent(percent: number): string {
  return String(Number(percent.toFixed(2)));
}
