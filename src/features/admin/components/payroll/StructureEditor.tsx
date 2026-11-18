import { useFetcher } from "react-router";
import { useId } from "react";
import type { adminPayrollAction } from "../../payrollAction";
import { normalizeMoney, normalizePercent } from "../../payrollFormat";
import type { FormulaNode, SalaryComponentView, SalaryStructureView } from "../../payrollViews";
import { describeFormula } from "./StructuresPanel";
import { Spinner } from "../../../../components/ui/Spinner";
import { TextInput } from "../../../../components/ui/TextInput";
import styles from "./StructureEditor.module.css";

/**
 * The structure editor card (the Structures tab's second card): the dated
 * revision the owner is building, one line per component. A same-date save
 * REPLACES that dated row — the BE's full-envelope contract, so the editor
 * always submits the complete line set it shows. The builder emits the two
 * AST shapes the house formulas need — "X% of a component" and that
 * plus/minus a flat amount; deeper ASTs validate on the BE but are not
 * offered here yet — and a stored deep formula shows as a caption so the
 * owner replaces it knowingly.
 */

export interface EditorLine {
  componentId: string;
  /** The name the BE resolved for the stored line — the editor's fallback
   *  label when the component is no longer in the library read. */
  componentName?: string;
  /** "pinned" = the component is inactive; the BE refuses the line, so the
   *  owner reactivates it or removes it. */
  mode: "amount" | "formula" | "pinned";
  amount: string;
  percent: string;
  ofComponentId: string;
  adjust: "" | "+" | "-";
  adjustValue: string;
  original?: { amount?: string; formula?: FormulaNode };
  /** A stored formula the builder cannot express — shown as a caption so
   *  the owner replaces it knowingly instead of staring at an empty box. */
  storedFormula?: FormulaNode;
}

export interface EditorState {
  /** The employee the editor was opened for. The panel only renders and
   *  saves this state while the URL still names the same employee — a
   *  Back/Forward or pasted URL can otherwise submit employee B's id with
   *  employee A's lines. */
  employeeId: string;
  effectiveFrom: string;
  lines: EditorLine[];
}

export function editorFrom(
  revision: SalaryStructureView,
  library: SalaryComponentView[],
  employeeId: string,
): EditorState {
  const activeIds = new Set(library.filter((c) => c.active).map((c) => c.id));
  return {
    employeeId,
    effectiveFrom: revision.effectiveFrom,
    lines: revision.lines.map((line) => {
      const amount = typeof line.amount === "string" ? line.amount : "";
      if (!activeIds.has(line.componentId)) {
        return {
          componentId: line.componentId,
          mode: "pinned" as const,
          amount: "",
          percent: "",
          ofComponentId: "",
          adjust: "" as const,
          adjustValue: "",
          original: {
            ...(amount !== "" ? { amount } : {}),
            ...(line.formula ? { formula: line.formula } : {}),
          },
        };
      }
      const built = buildFromFormula(line.formula);
      if (built !== null) {
        return {
          componentId: line.componentId,
          mode: "formula" as const,
          amount: "",
          percent: built.percent,
          ofComponentId: built.ofComponentId,
          adjust: built.adjust,
          adjustValue: built.adjustValue,
        };
      }
      return {
        componentId: line.componentId,
        mode: "amount" as const,
        amount,
        percent: "",
        ofComponentId: "",
        adjust: "" as const,
        adjustValue: "",
        storedFormula: line.formula ?? undefined,
      };
    }),
  };
}

/** Recognise the builder's two shapes in a stored AST so an edit round-trips
 *  through the same controls. Anything deeper reads as a formula the owner
 *  can replace (the revision itself is untouched until they save). */
function buildFromFormula(
  node: FormulaNode | null | undefined,
): { percent: string; ofComponentId: string; adjust: "" | "+" | "-"; adjustValue: string } | null {
  if (node === undefined || node === null) return null;
  if (node.kind === "percent-of" && node.of.kind === "component") {
    return {
      percent: trimPercentOf(node.percent),
      ofComponentId: node.of.componentId,
      adjust: "",
      adjustValue: "",
    };
  }
  if (
    node.kind === "binary" &&
    (node.op === "+" || node.op === "-") &&
    node.left.kind === "percent-of" &&
    node.left.of.kind === "component" &&
    node.right.kind === "const"
  ) {
    return {
      percent: trimPercentOf(node.left.percent),
      ofComponentId: node.left.of.componentId,
      adjust: node.op,
      adjustValue: String(Number(node.right.value.toFixed(2))),
    };
  }
  return null;
}

function trimPercentOf(percent: number): string {
  return String(Number(percent.toFixed(2)));
}

export function StructureEditorCard({
  editor,
  setEditor,
  employeeId,
  employeeName,
  activeComponents,
  library,
}: {
  editor: EditorState;
  setEditor: (next: EditorState | null) => void;
  employeeId: string;
  employeeName: string;
  activeComponents: SalaryComponentView[];
  library: SalaryComponentView[];
}) {
  const fetcher = useFetcher<typeof adminPayrollAction>();
  const titleId = useId();
  const busy = fetcher.state !== "idle";
  const result =
    typeof fetcher.data === "object" && fetcher.data !== null && "kind" in fetcher.data
      ? (fetcher.data as { kind: string; state: string; message?: string })
      : null;
  const saved = result?.state === "done";
  const error = result?.state === "error" ? (result.message ?? "") : "";
  const names = new Map(library.map((c) => [c.id, c.name] as const));

  const usedIds = new Set(editor.lines.map((line) => line.componentId));
  const addable = activeComponents.filter((c) => !usedIds.has(c.id));
  const basicInactive = library.some((c) => c.isBasic && !c.active);
  // The BE requires the basic component's line in every structure even when
  // that component is inactive — the hint must survive exactly the state
  // where the save will certainly be refused.
  const missingBasic =
    library.some((c) => c.isBasic) &&
    !editor.lines.some((line) => library.find((c) => c.id === line.componentId)?.isBasic === true);

  const update = (index: number, patch: Partial<EditorLine>): void => {
    setEditor({
      ...editor,
      lines: editor.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    });
  };

  const removeLine = (index: number): void => {
    setEditor({ ...editor, lines: editor.lines.filter((_, i) => i !== index) });
  };

  const addLine = (componentId: string): void => {
    if (componentId === "") return;
    setEditor({
      ...editor,
      lines: [
        ...editor.lines,
        {
          componentId,
          mode: "amount",
          amount: "",
          percent: "",
          ofComponentId: "",
          adjust: "",
          adjustValue: "",
        },
      ],
    });
  };

  /** The exact lines the save will carry — the editor shows everything that
   *  goes on the wire, and `null` means a line is still unfinished. */
  const linesJson = (): string | null => {
    const lines: Array<{ componentId: string; amount?: string; formula?: FormulaNode }> = [];
    for (const line of editor.lines) {
      if (line.mode === "pinned") {
        if (line.original === undefined) return null;
        lines.push({ componentId: line.componentId, ...line.original });
        continue;
      }
      if (line.mode === "amount") {
        const amount = normalizeMoney(line.amount);
        if (amount === null) {
          // An empty Amount on a line that carries a stored formula keeps
          // that formula unchanged — replacement is an explicit act.
          if (line.storedFormula !== undefined) {
            lines.push({ componentId: line.componentId, formula: line.storedFormula });
            continue;
          }
          return null;
        }
        lines.push({ componentId: line.componentId, amount });
        continue;
      }
      const percent = normalizePercent(line.percent);
      if (percent === null || line.ofComponentId === "") return null;
      const base: FormulaNode = {
        kind: "percent-of",
        percent,
        of: { kind: "component", componentId: line.ofComponentId },
      };
      if (line.adjust === "") {
        lines.push({ componentId: line.componentId, formula: base });
        continue;
      }
      const value = normalizeMoney(line.adjustValue);
      if (value === null) return null;
      lines.push({
        componentId: line.componentId,
        formula: {
          kind: "binary",
          op: line.adjust,
          left: base,
          right: { kind: "const", value: Number(value) },
        },
      });
    }
    return JSON.stringify(lines);
  };

  const json = linesJson();
  const ready =
    /^\d{4}-\d{2}-\d{2}$/.test(editor.effectiveFrom) && editor.lines.length > 0 && json !== null;

  if (saved) {
    return (
      <div className={styles.card}>
        <h2 className={styles.panelTitle}>Structure saved</h2>
        <p className={styles.savedMark} role="status">
          {employeeName}'s structure now applies from {editor.effectiveFrom}. It shows in the
          revision list above.
        </p>
        <div className={styles.editorActions}>
          <button type="button" className={styles.saveButton} onClick={() => setEditor(null)}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.panelTitle}>
        Salary for {employeeName} — applies from {editor.effectiveFrom}
      </h2>
      <p className={styles.panelLede}>
        Saving replaces this dated revision in full. Keep the date to fix it; move the date to start
        a new revision.
      </p>
      <div className={styles.editorGrid}>
        <TextInput
          id={`${titleId}-date`}
          label="Applies from"
          type="date"
          value={editor.effectiveFrom}
          onChange={(value) => setEditor({ ...editor, effectiveFrom: value })}
          hint="Runs resolve pay by the month's first day — date it on the 1st to govern that month; a mid-month date first governs the next month."
        />
        {missingBasic ? (
          <p className={styles.hint} role="status">
            Structures must include the Basic salary component — save will be refused without it.
            {basicInactive
              ? " The Basic component is inactive right now — reactivate it first."
              : ""}
          </p>
        ) : null}
        <div className={styles.lineList}>
          {editor.lines.map((line, index) => {
            const component = library.find((c) => c.id === line.componentId);
            // The percent-of base must be a line the BE can evaluate — a
            // pinned (inactive) component would be refused outright.
            const others = editor.lines.filter(
              (_, i) => i !== index && editor.lines[i].mode !== "pinned",
            );
            return (
              <div key={line.componentId} className={styles.lineRow}>
                <span className={styles.lineName}>
                  {component?.name ?? line.componentName ?? "Component"}
                </span>
                {line.mode === "pinned" ? (
                  <span className={styles.pinnedNote}>
                    This component is inactive — reactivate it first, or remove the line.
                  </span>
                ) : line.mode === "amount" && line.storedFormula !== undefined ? (
                  <span className={styles.pinnedNote}>
                    Stored formula: {describeFormula(line.storedFormula, names)} — leave Amount
                    empty to keep it, or type an amount to replace it.
                  </span>
                ) : (
                  <span className={styles.lineControls}>
                    <label className={styles.modeLabel}>
                      <input
                        type="radio"
                        name={`${titleId}-mode-${index}`}
                        checked={line.mode === "amount"}
                        onChange={() => update(index, { mode: "amount" })}
                      />
                      Amount
                    </label>
                    <label className={styles.modeLabel}>
                      <input
                        type="radio"
                        name={`${titleId}-mode-${index}`}
                        checked={line.mode === "formula"}
                        onChange={() => update(index, { mode: "formula" })}
                      />
                      Formula
                    </label>
                    {line.mode === "amount" ? (
                      <TextInput
                        id={`${titleId}-amount-${index}`}
                        label="Amount"
                        hideLabel
                        inputMode="decimal"
                        value={line.amount}
                        onChange={(value) => update(index, { amount: value })}
                        placeholder="20000.00"
                        maxLength={16}
                      />
                    ) : (
                      <span className={styles.formulaControls}>
                        <TextInput
                          id={`${titleId}-pct-${index}`}
                          label="Percent"
                          hideLabel
                          inputMode="decimal"
                          value={line.percent}
                          onChange={(value) => update(index, { percent: value })}
                          placeholder="40"
                          maxLength={6}
                        />
                        <span className={styles.formulaWord}>% of</span>
                        <select
                          aria-label="Percent of component"
                          className={styles.ofSelect}
                          value={line.ofComponentId}
                          onChange={(event) => update(index, { ofComponentId: event.target.value })}
                        >
                          <option value="">choose…</option>
                          {others.map((other) => (
                            <option key={other.componentId} value={other.componentId}>
                              {names.get(other.componentId) ?? "Component"}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label="Adjustment"
                          className={styles.adjustSelect}
                          value={line.adjust}
                          onChange={(event) =>
                            update(index, { adjust: event.target.value as "" | "+" | "-" })
                          }
                        >
                          <option value="">no adjustment</option>
                          <option value="+">+ flat amount</option>
                          <option value="-">− flat amount</option>
                        </select>
                        {line.adjust !== "" ? (
                          <TextInput
                            id={`${titleId}-adj-${index}`}
                            label="Flat amount"
                            hideLabel
                            inputMode="decimal"
                            value={line.adjustValue}
                            onChange={(value) => update(index, { adjustValue: value })}
                            placeholder="1000.00"
                            maxLength={16}
                          />
                        ) : null}
                      </span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeLine(index)}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
        {addable.length > 0 ? (
          <div className={styles.addRow}>
            <select
              aria-label="Add a component"
              className={styles.ofSelect}
              value=""
              onChange={(event) => addLine(event.target.value)}
            >
              <option value="">Add a component…</option>
              {addable.map((component) => (
                <option key={component.id} value={component.id}>
                  {component.name}
                  {component.isBasic ? " (Basic)" : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {error !== "" ? (
          <p className={styles.errorLine} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.editorActions}>
          <button
            type="button"
            className={styles.quietButton}
            onClick={() => setEditor(null)}
            disabled={busy}
          >
            Cancel
          </button>
          {json === null ? (
            <p className={styles.hint}>Fill every line — amounts and percentages — to save.</p>
          ) : null}
          <fetcher.Form method="post" className={styles.saveForm}>
            <input type="hidden" name="intent" value="structure-save" />
            <input type="hidden" name="userId" value={employeeId} />
            <input type="hidden" name="effectiveFrom" value={editor.effectiveFrom} />
            <input type="hidden" name="lines" value={json ?? ""} />
            <button type="submit" className={styles.saveButton} disabled={busy || !ready}>
              {busy ? <Spinner size={13} /> : null}
              {busy ? "Saving…" : "Save revision"}
            </button>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}
