import { useId, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { adminPayrollAction } from "../../payrollAction";
import { fmtMoney, normalizeMoney } from "../../payrollFormat";
import type { MemberRow } from "../../companyApi";
import { Dropdown } from "../Dropdown";
import { Spinner } from "../../../../components/ui/Spinner";
import { TextInput } from "../../../../components/ui/TextInput";
import dialogStyles from "../JobSettingsDialog.module.css";
import styles from "./OverrideDialog.module.css";

/**
 * The statutory override control (the run card's quiet action): set one
 * employee's PF-employee or TDS amount for one month, over the engine's
 * computed figure. The employer-liability acknowledgment is the BE's
 * contract — the checkbox must be ticked before the save enables, and the
 * BE refuses again with its own copy if it arrives false. The amount is
 * digits-only money text; the employee rides the URL path (user id).
 */
export function OverrideControl({ month, members }: { month: string; members: MemberRow[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);
  const roster = members.filter((m) => m.role === "employee" && m.status === "active");
  return (
    <>
      <button
        type="button"
        className={styles.controlButton}
        onClick={() => {
          setOpenCount((count) => count + 1);
          dialogRef.current?.showModal();
        }}
        aria-haspopup="dialog"
      >
        Override a statutory amount
      </button>
      <dialog
        ref={dialogRef}
        className={`${dialogStyles.dialog} ${styles.wideDialog}`}
        aria-label="Override a statutory amount"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {openCount > 0 ? (
          <OverrideForm
            key={openCount}
            month={month}
            roster={roster}
            close={() => dialogRef.current?.close()}
          />
        ) : null}
      </dialog>
    </>
  );
}

function OverrideForm({
  month,
  roster,
  close,
}: {
  month: string;
  roster: MemberRow[];
  close: () => void;
}) {
  const fetcher = useFetcher<typeof adminPayrollAction>();
  const titleId = useId();
  const [userId, setUserId] = useState("");
  const [field, setField] = useState<"pf_employee" | "tds">("pf_employee");
  const [amount, setAmount] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const busy = fetcher.state !== "idle";
  const result =
    fetcher.data !== undefined && typeof fetcher.data === "object" && "kind" in fetcher.data
      ? (fetcher.data as { kind: string; state: string; message?: string })
      : null;
  const done = result?.state === "done";
  const error = result?.state === "error" ? (result.message ?? "") : "";
  const amountValue = normalizeMoney(amount);
  const ready = userId !== "" && amountValue !== null && acknowledged;
  if (done) {
    return (
      <div className={dialogStyles.dialogForm}>
        <h3 id={titleId} className={dialogStyles.dialogTitle}>
          Override saved
        </h3>
        <p className={dialogStyles.savedMark} role="status">
          The next run of {month} pays this amount. The employer carries the statutory exposure for
          it.
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
      <input type="hidden" name="intent" value="override-set" />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="amount" value={amountValue ?? ""} />
      <input type="hidden" name="acknowledgedLiability" value={String(acknowledged)} />
      <h3 id={titleId} className={dialogStyles.dialogTitle}>
        Override a statutory amount — {month}
      </h3>
      <p className={dialogStyles.dialogHint}>
        The run pays this figure instead of the computed one. The employer carries the statutory
        exposure for anything overridden.
      </p>
      <div className={styles.pickerRow}>
        <Dropdown
          label="Employee"
          options={roster.map((m) => ({
            value: m.userId,
            label: m.name ?? "(no name)",
            meta: m.employeeCode,
          }))}
          value={userId}
          onChange={setUserId}
        />
      </div>
      <label className={styles.fieldLabel}>
        Which amount
        <select
          className={styles.select}
          value={field}
          onChange={(event) => setField(event.target.value === "tds" ? "tds" : "pf_employee")}
        >
          <option value="pf_employee">PF — employee share</option>
          <option value="tds">TDS</option>
        </select>
      </label>
      <TextInput
        id={`${titleId}-amount`}
        label="Amount per month"
        inputMode="decimal"
        value={amount}
        onChange={(value) => setAmount(value.replace(/[^\d.]/g, ""))}
        placeholder="12000.00"
        maxLength={16}
        hint="Digits only, up to two decimals."
      />
      <label className={dialogStyles.switchRow}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        />
        <span>
          I accept the employer-liability acknowledgment
          <small>
            {field === "pf_employee"
              ? "The run pays this PF amount and the employer carries the statutory exposure."
              : "The run pays this TDS figure and the employer carries the statutory exposure."}
          </small>
        </span>
      </label>
      {amountValue !== null ? (
        <p className={dialogStyles.dialogHint}>
          Saves as {fmtMoney(amountValue)} for {month}.
        </p>
      ) : null}
      {error !== "" ? (
        <p className={dialogStyles.dialogError} role="alert">
          {error}
        </p>
      ) : null}
      <div className={dialogStyles.dialogActions}>
        <button type="button" className={dialogStyles.quietButton} onClick={close} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className={dialogStyles.saveButton} disabled={busy || !ready}>
          {busy ? <Spinner size={13} /> : null}
          {busy ? "Saving…" : "Save override"}
        </button>
      </div>
    </fetcher.Form>
  );
}
