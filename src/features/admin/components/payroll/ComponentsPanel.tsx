import { Form, useActionData, useFetcher, useNavigation } from "react-router";
import { useId, useRef, useState } from "react";
import type { adminPayrollAction } from "../../payrollAction";
import type { SalaryComponentView } from "../../payrollViews";
import { Spinner } from "../../../../components/ui/Spinner";
import { TextInput } from "../../../../components/ui/TextInput";
import { DataTable, type TableCell } from "../Table";
import dialogStyles from "../JobSettingsDialog.module.css";
import styles from "./ComponentsPanel.module.css";

/**
 * The Components tab: the company's salary component library — the names
 * payslips print and the structures reference. Exactly one component is
 * Basic (the PF base and every structure's anchor); deactivation keeps the
 * name on old revisions but hides it from new structure lines. Every domain
 * rule is the BE's — the dialogs here only check wire shape and render the
 * BE's plain-English refusals.
 */

export function ComponentsPanel({
  components,
}: {
  components: { ok: true; data: SalaryComponentView[] } | { ok: false };
}) {
  if (!components.ok) {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          The component library could not load. Try opening this page again from the menu.
        </p>
      </div>
    );
  }
  const rows = components.data;
  const tableRows: TableCell[][] = rows.map((component) => [
    { text: component.name },
    { text: component.isBasic ? "Basic" : "—" },
    { text: component.active ? "Active" : "Inactive", status: true },
    { text: "Edit component", node: <ComponentEditControl component={component} /> },
  ]);
  return (
    <div className={styles.card}>
      <div className={styles.panelHead}>
        <p className={styles.panelLede}>
          Salary components are the lines a pay structure is built from — Basic salary first.
        </p>
        <AddComponentControl />
      </div>
      <DataTable
        columns={["Name", "Basic", "Status", ""]}
        rows={tableRows}
        empty="No components yet. Add Basic salary first — every structure starts with it."
      />
    </div>
  );
}

type ComponentIntentResult =
  | { kind: "component-create" | "component-update"; state: "done"; componentId?: string }
  | {
      kind: "component-create" | "component-update";
      state: "error";
      componentId?: string;
      message: string;
    };

function asResult(data: unknown, kind: string): ComponentIntentResult | null {
  if (typeof data !== "object" || data === null) return null;
  const candidate = data as ComponentIntentResult;
  return candidate.kind === kind ? candidate : null;
}

/** The header's add control. The dialog stays mounted; the form inside
 *  remounts per open, so a reopened dialog never shows the last save's mark. */
function AddComponentControl() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);
  return (
    <>
      <button
        type="button"
        className={styles.addButton}
        onClick={() => {
          setOpenCount((count) => count + 1);
          dialogRef.current?.showModal();
        }}
        aria-haspopup="dialog"
      >
        Add component
      </button>
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-label="Add component"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {openCount > 0 ? (
          <AddComponentForm key={openCount} close={() => dialogRef.current?.close()} />
        ) : null}
      </dialog>
    </>
  );
}

function AddComponentForm({ close }: { close: () => void }) {
  const fetcher = useFetcher<typeof adminPayrollAction>();
  const titleId = useId();
  const [name, setName] = useState("");
  const [isBasic, setIsBasic] = useState(false);
  const busy = fetcher.state !== "idle";
  const result = asResult(fetcher.data, "component-create");
  const ready = name.trim() !== "";
  if (result !== null && result.state === "done") {
    return (
      <div className={dialogStyles.dialogForm}>
        <h3 id={titleId} className={dialogStyles.dialogTitle}>
          Component saved
        </h3>
        <p className={dialogStyles.savedMark} role="status">
          “{name.trim()}” is in the library.
        </p>
        <div className={dialogStyles.dialogActions}>
          <button type="button" className={dialogStyles.saveButton} onClick={close}>
            Close
          </button>
        </div>
      </div>
    );
  }
  return (
    <fetcher.Form method="post" className={dialogStyles.dialogForm}>
      <input type="hidden" name="intent" value="component-create" />
      <h3 id={titleId} className={dialogStyles.dialogTitle}>
        Add component
      </h3>
      <p className={dialogStyles.dialogHint}>
        House rent, travel allowance, performance pay — each one becomes a line a structure can set.
      </p>
      <TextInput
        id={`${titleId}-name`}
        name="name"
        label="Name"
        value={name}
        onChange={setName}
        autoComplete="off"
        maxLength={60}
        hint="The name every structure line uses."
      />
      <label className={dialogStyles.switchRow}>
        <input
          type="checkbox"
          name="isBasic"
          value="true"
          checked={isBasic}
          onChange={(event) => setIsBasic(event.target.checked)}
        />
        <span>
          This is the Basic salary component
          <small>Only one per company — it anchors PF and every structure.</small>
        </span>
      </label>
      {result !== null && result.state === "error" ? (
        <p className={dialogStyles.dialogError} role="alert">
          {result.message}
        </p>
      ) : null}
      <div className={dialogStyles.dialogActions}>
        <button type="button" className={dialogStyles.quietButton} onClick={close}>
          Cancel
        </button>
        <button type="submit" className={dialogStyles.saveButton} disabled={busy || !ready}>
          {busy ? <Spinner size={13} /> : null}
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </fetcher.Form>
  );
}

/** One row's Edit control: rename, move the Basic mark, activate or
 *  deactivate. The body is tri-state — only the fields that differ from the
 *  loaded values ride the form, so untouched keys are never sent. */
function ComponentEditControl({ component }: { component: SalaryComponentView }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const action = useActionData<typeof adminPayrollAction>();
  const navigation = useNavigation();
  // The form remounts per open, so a reopened dialog shows the row's
  // values — never the previous save's mark.
  const [openCount, setOpenCount] = useState(0);
  const [name, setName] = useState(component.name);
  const [isBasic, setIsBasic] = useState(component.isBasic);
  const [active, setActive] = useState(component.active);
  const busy =
    navigation.state === "submitting" && navigation.formData?.get("componentId") === component.id;
  const result = asResult(action, "component-update");
  const saved = result?.state === "done" && result.componentId === component.id;
  const error =
    result?.state === "error" && result.componentId === component.id ? result.message : null;

  // An emptied name is refused, loudly and before send — a silent drop would
  // show "Saved." while the rename vanished.
  const nameCleared = name.trim() === "";
  const changed: Record<string, string> = {};
  if (name.trim() !== component.name && !nameCleared) changed.name = name.trim();
  if (isBasic !== component.isBasic) changed.isBasic = String(isBasic);
  if (active !== component.active) changed.active = String(active);

  return (
    <>
      <button
        type="button"
        className={styles.editButton}
        onClick={() => {
          setName(component.name);
          setIsBasic(component.isBasic);
          setActive(component.active);
          setOpenCount((count) => count + 1);
          if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
        }}
        aria-haspopup="dialog"
      >
        Edit
      </button>
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {/* Keyed per open: a reopened dialog shows the row's values, never
            the previous save's result. */}
        <Form key={openCount} method="post" className={dialogStyles.dialogForm}>
          <input type="hidden" name="intent" value="component-update" />
          <input type="hidden" name="componentId" value={component.id} />
          {Object.entries(changed).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <h3 id={titleId} className={dialogStyles.dialogTitle}>
            Edit “{component.name}”
          </h3>
          {saved ? (
            <p className={dialogStyles.savedMark} role="status">
              Saved.
            </p>
          ) : null}
          <TextInput
            id={`${titleId}-name`}
            name="display-name"
            label="Name"
            value={name}
            onChange={setName}
            autoComplete="off"
            maxLength={60}
            hint="The name every structure line uses."
            error={nameCleared ? "A component must have a name." : undefined}
          />
          <label className={dialogStyles.switchRow}>
            <input
              type="checkbox"
              checked={isBasic}
              onChange={(event) => setIsBasic(event.target.checked)}
            />
            <span>
              Basic salary component
              <small>Another component holding the mark must be unmarked first.</small>
            </span>
          </label>
          <label className={dialogStyles.switchRow}>
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            <span>
              Active
              <small>
                Old revisions keep an inactive component's name; new structure lines cannot use it.
              </small>
            </span>
          </label>
          {error !== null ? (
            <p className={dialogStyles.dialogError} role="alert">
              {error}
            </p>
          ) : null}
          <div className={dialogStyles.dialogActions}>
            <button
              type="button"
              className={dialogStyles.quietButton}
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={dialogStyles.saveButton}
              disabled={busy === true || nameCleared || Object.keys(changed).length === 0}
            >
              {busy === true ? <Spinner size={13} /> : null}
              {busy === true ? "Saving…" : "Save"}
            </button>
          </div>
        </Form>
      </dialog>
    </>
  );
}
