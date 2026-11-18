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
          The structures page could not load. Try opening this page again from the menu.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <p className={styles.panelLede}>
          A salary structure says what each component pays, from a date. The newest revision at or
          before a month governs that month's run.
        </p>
        <div className={styles.pickerRow}>
          <Dropdown
            label="Employee"
            options={roster.map((m) => ({
              value: m.userId,
              label: m.name ?? "(no name)",
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
            Pick an employee to see their salary structure. A revision stays in force from its date
            until a later one replaces it.
          </p>
        ) : !structures.ok ? (
          <p className={styles.failed} role="alert">
            {employee.name ?? "This employee"}'s structure could not load. Try again.
          </p>
        ) : (
          <>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>
                {employee.name ?? "(no name)"} · {employee.employeeCode}
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
                New revision
              </button>
            </div>
            {revisions.length === 0 && editor === null ? (
              <p className={styles.empty}>
                No salary structure yet. Save the first revision to start pay for this employee.
              </p>
            ) : null}
            <ul className={styles.revisions}>
              {[...revisions].reverse().map((revision) => (
                <li key={revision.effectiveFrom} className={styles.revision}>
                  <div className={styles.revisionHead}>
                    <span>
                      Applies from{" "}
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
          employeeName={employee.name ?? "(no name)"}
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
          <th scope="col">Component</th>
          <th scope="col">Amount</th>
          <th scope="col">Computed</th>
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
