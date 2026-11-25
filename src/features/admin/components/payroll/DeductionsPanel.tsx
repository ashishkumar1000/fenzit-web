import { Form, useActionData, useFetcher, useNavigation } from "react-router";
import { useId, useRef, useState } from "react";
import type { adminPayrollAction } from "../../payrollAction";
import { istToday } from "../../format";
import { fmtMoney } from "../../payrollFormat";
import type { DeductionHeadView } from "../../payrollViews";
import { Spinner } from "../../../../components/ui/Spinner";
import { TextInput } from "../../../../components/ui/TextInput";
import { DataTable, type TableCell } from "../Table";
import dialogStyles from "../JobSettingsDialog.module.css";
import styles from "./DeductionsPanel.module.css";

/**
 * The Deductions tab: company-level deduction heads — flat amounts or
 * percentages of Basic/Gross, effective-dated (the newest row at or before
 * a month applies). A head is never deleted; deactivation retires it from
 * resolution and needs the confirm checkbox, because there is no undo.
 */

type HeadsSlice = { ok: true; data: DeductionHeadView[] } | { ok: false };

export function DeductionsPanel({ heads }: { heads: HeadsSlice }) {
  const action = useActionData<typeof adminPayrollAction>();
  if (!heads.ok) {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          {
            "We could not load the deduction details.\nPlease go back to the menu and open this page again."
          }
        </p>
      </div>
    );
  }
  const rows: TableCell[][] = heads.data.map((head) => [
    { text: head.name },
    {
      text:
        head.kind === "percent"
          ? `Percentage of ${head.basis === "basic" ? "Basic Salary" : "Total Salary"}`
          : "Fixed Amount",
    },
    {
      text: head.kind === "percent" ? `${trimPercent(head.amount)}%` : fmtMoney(head.amount),
    },
    { text: head.effectiveFrom, quiet: true },
    { text: head.active ? "Active" : "Stopped", status: true },
    {
      text: head.active ? "Stop" : "",
      node: head.active ? <DeactivateControl head={head} /> : undefined,
    },
  ]);
  return (
    <div className={styles.card}>
      <div className={styles.panelHead}>
        <p className={styles.panelLede}>
          Deductions are amounts taken out of an employee's salary. For example: Professional Tax,
          Insurance or money an employee has to repay to the company. The latest saved deduction
          rule will be used for the selected month.
        </p>
        <AddHeadControl />
      </div>
      <DataTable
        columns={["Deduction Name", "Deduction Type", "Amount", "Starts From", "Status", "Actions"]}
        rows={rows}
        empty="No deductions have been added yet."
      />
      {action !== undefined && isDeactivateResult(action) && action.state === "error" ? (
        <p className={styles.errorLine} role="alert">
          {action.message}
        </p>
      ) : null}
    </div>
  );
}

type HeadIntentResult =
  | { kind: "head-save" | "head-deactivate"; state: "done" }
  | { kind: "head-save" | "head-deactivate"; state: "error"; message: string };

function isHeadResult(data: unknown): data is HeadIntentResult {
  if (typeof data !== "object" || data === null) return false;
  const kind = (data as { kind?: unknown }).kind;
  return kind === "head-save" || kind === "head-deactivate";
}

function trimPercent(text: string): string {
  const value = Number(text);
  return Number.isFinite(value) ? String(value) : text;
}

function isDeactivateResult(
  data: unknown,
): data is { kind: "head-deactivate"; state: "error"; message: string } {
  return isHeadResult(data) && data.kind === "head-deactivate" && data.state === "error";
}

function AddHeadControl() {
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
        Add Deduction
      </button>
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-label="Add Deduction"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {openCount > 0 ? (
          <AddHeadForm key={openCount} close={() => dialogRef.current?.close()} />
        ) : null}
      </dialog>
    </>
  );
}

function AddHeadForm({ close }: { close: () => void }) {
  const fetcher = useFetcher<typeof adminPayrollAction>();
  const titleId = useId();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"flat" | "percent">("flat");
  const [amount, setAmount] = useState("");
  const [basis, setBasis] = useState<"basic" | "gross">("gross");
  const [effectiveFrom, setEffectiveFrom] = useState(istToday());
  const busy = fetcher.state !== "idle";
  const result =
    isHeadResult(fetcher.data) && fetcher.data.kind === "head-save" ? fetcher.data : null;
  const percentNeedsBasis = kind === "percent";
  const ready = name.trim() !== "" && amount.trim() !== "" && effectiveFrom !== "";
  if (result !== null && result.state === "done") {
    return (
      <div className={dialogStyles.dialogForm}>
        <h3 id={titleId} className={dialogStyles.dialogTitle}>
          Deduction Added
        </h3>
        <p className={dialogStyles.savedMark} role="status">
          "{name.trim()}" will be deducted from {effectiveFrom}.
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
      <input type="hidden" name="intent" value="head-save" />
      <h3 id={titleId} className={dialogStyles.dialogTitle}>
        Add Deduction
      </h3>
      <TextInput
        id={`${titleId}-name`}
        name="name"
        label="Deduction Name"
        value={name}
        onChange={setName}
        autoComplete="off"
        maxLength={60}
      />
      <label className={styles.fieldLabel}>
        Deduction Type
        <select
          name="kind"
          className={styles.select}
          value={kind}
          onChange={(event) => setKind(event.target.value === "percent" ? "percent" : "flat")}
        >
          <option value="flat">Fixed Amount Every Month</option>
          <option value="percent">Percentage of Salary</option>
        </select>
      </label>
      <TextInput
        id={`${titleId}-amount`}
        name="amount"
        label={kind === "percent" ? "Percentage" : "Amount Per Month"}
        inputMode="decimal"
        value={amount}
        onChange={setAmount}
        placeholder={kind === "percent" ? "2" : "200"}
        maxLength={16}
        hint={
          kind === "percent"
            ? "Enter a number between 0 and 100. You can enter up to 2 decimal places."
            : undefined
        }
      />
      {percentNeedsBasis ? (
        <label className={styles.fieldLabel}>
          Calculate Percentage On
          <select
            name="basis"
            className={styles.select}
            value={basis}
            onChange={(event) => setBasis(event.target.value === "basic" ? "basic" : "gross")}
          >
            <option value="gross">Total Salary</option>
            <option value="basic">Basic Salary</option>
          </select>
        </label>
      ) : null}
      <TextInput
        id={`${titleId}-date`}
        name="effectiveFrom"
        label="Starts From"
        type="date"
        value={effectiveFrom}
        onChange={setEffectiveFrom}
      />
      <p className={dialogStyles.dialogHint}>
        {
          "Choose the date from which this deduction should start.\nIf you save another deduction with the same name and date, the old one will be replaced."
        }
      </p>
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

function DeactivateControl({ head }: { head: DeductionHeadView }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [confirm, setConfirm] = useState(false);
  const navigation = useNavigation();
  const busy = navigation.state === "submitting" && navigation.formData?.get("headId") === head.id;
  return (
    <>
      <button
        type="button"
        className={styles.deactivateButton}
        onClick={() => {
          setConfirm(false);
          dialogRef.current?.showModal();
        }}
        aria-haspopup="dialog"
      >
        Stop
      </button>
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <Form method="post" className={dialogStyles.dialogForm}>
          <input type="hidden" name="intent" value="head-deactivate" />
          <input type="hidden" name="headId" value={head.id} />
          <h3 id={titleId} className={dialogStyles.dialogTitle}>
            Stop "{head.name}"?
          </h3>
          <p className={dialogStyles.dialogHint}>
            {
              "Once you stop this deduction, it will not be applied to future salary payments.\nSalary payments that have already been completed will not change.\nThis action cannot be undone."
            }
          </p>
          <label className={dialogStyles.switchRow}>
            <input
              type="checkbox"
              name="confirm"
              value="true"
              checked={confirm}
              onChange={(event) => setConfirm(event.target.checked)}
            />
            <span>I understand. Stop this deduction.</span>
          </label>
          <div className={dialogStyles.dialogActions}>
            <button
              type="button"
              className={dialogStyles.quietButton}
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className={dialogStyles.saveButton} disabled={busy || !confirm}>
              {busy ? <Spinner size={13} /> : null}
              {busy ? "Stopping…" : "Stop Deduction"}
            </button>
          </div>
        </Form>
      </dialog>
    </>
  );
}
