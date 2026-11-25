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
        Change Government Deduction Amount
      </button>
      <dialog
        ref={dialogRef}
        className={`${dialogStyles.dialog} ${styles.wideDialog}`}
        aria-label="Change Government Deduction Amount"
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
          Amount Updated
        </h3>
        <p className={dialogStyles.savedMark} role="status">
          The next salary calculation for {month} will use this amount.
          <br />
          The company will be responsible for any government compliance difference caused by
          changing this amount.
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
        Change Government Deduction Amount – {month}
      </h3>
      <p className={dialogStyles.dialogHint}>
        The next salary calculation will use the amount you enter instead of the amount calculated
        by the system.
        <br />
        The company will be responsible for any difference or legal issue caused by this change.
      </p>
      <div className={styles.pickerRow}>
        <Dropdown
          label="Employee"
          options={roster.map((m) => ({
            value: m.userId,
            label: m.name ?? "No Name",
            meta: m.employeeCode,
          }))}
          value={userId}
          onChange={setUserId}
        />
      </div>
      <label className={styles.fieldLabel}>
        Which Amount Do You Want to Change?
        <select
          className={styles.select}
          value={field}
          onChange={(event) => setField(event.target.value === "tds" ? "tds" : "pf_employee")}
        >
          <option value="pf_employee">PF – Employee's Share</option>
          <option value="tds">Income Tax (TDS)</option>
        </select>
      </label>
      <TextInput
        id={`${titleId}-amount`}
        label="Amount Per Month"
        inputMode="decimal"
        value={amount}
        onChange={(value) => setAmount(value.replace(/[^\d.]/g, ""))}
        placeholder="12000.00"
        maxLength={16}
        hint="Enter numbers only. You can enter up to 2 decimal places."
      />
      <label className={dialogStyles.switchRow}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        />
        <span>
          I understand that the company is responsible for this change.
          <small>
            {field === "pf_employee"
              ? "The next salary calculation will use this PF amount. The company is responsible for any difference from the government-required amount."
              : "The next salary calculation will use this TDS amount. The company is responsible for any difference from the government-required amount."}
          </small>
        </span>
      </label>
      {amountValue !== null ? (
        <p className={dialogStyles.dialogHint}>
          The amount saved will be {fmtMoney(amountValue)} for {month}.
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
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </fetcher.Form>
  );
}
