import { useFetcher } from "react-router";
import { useId, useState } from "react";
import type { LeaveTypeRow } from "../leaveApi";
import type { LeaveActionResult } from "../leaveLoaders";
import { Spinner } from "../../../components/ui/Spinner";
import { TextInput } from "../../../components/ui/TextInput";
import dialogStyles from "./JobSettingsDialog.module.css";
import styles from "./LeaveTypeEditor.module.css";

const MODE_CHIP: Record<string, string> = {
  monthly: "Monthly accrual",
  annual: "Annual grant",
  none: "Event basis",
};

/** The rate quick-sets — one tap fills the input (the design's presets). */
const RATE_PRESETS = ["0", "1", "1.5", "2"];

/** The selected leave type's rules editor — the design's master-detail
 *  detail half. The catalog is fixed, so the editor edits VALUES only: the
 *  enable and paid toggles, the accrual rate (with presets and the ×12
 *  conversion), then carry-forward and over-balance for monthly types. The
 *  save posts changed fields only — the same contract the backend's
 *  values-only PATCH keeps; the button sleeps until something changed. */
export function LeaveTypeEditor({ type }: { type: LeaveTypeRow }) {
  const fetcher = useFetcher<LeaveActionResult>();
  const formId = useId();
  const monthly = type.accrualMode === "monthly";
  const hasRate = monthly || type.accrualMode === "annual";
  const [days, setDays] = useState(String(type.accrualDays));
  const [carryForward, setCarryForward] = useState(type.carryForward);
  const [allowOverBalance, setAllowOverBalance] = useState(type.allowOverBalance);
  const [paid, setPaid] = useState(type.paid);
  const [enabled, setEnabled] = useState(type.enabled);

  const daysText = days.trim();
  const daysOk = /^\d{1,3}(\.\d{1,2})?$/.test(daysText) && Number(daysText) <= 366;
  // "1.0" and "1" are the same value — compare numerically.
  const daysDirty = hasRate && daysOk && Number(daysText) !== type.accrualDays;
  const dirty =
    daysDirty ||
    carryForward !== type.carryForward ||
    allowOverBalance !== type.allowOverBalance ||
    paid !== type.paid ||
    enabled !== type.enabled;
  const annualDays = monthly && daysOk ? String(Number((Number(daysText) * 12).toFixed(2))) : null;

  const busy = fetcher.state !== "idle";
  const saved = fetcher.data !== undefined && fetcher.data.state === "done";
  const error =
    fetcher.data !== undefined && fetcher.data.state === "error" ? fetcher.data.message : null;

  return (
    <section className={styles.editor} aria-label={`${type.name} rules`}>
      <header className={styles.head}>
        <h3 className={styles.title}>{type.name} rules</h3>
        <span className={styles.stateChip} data-live={enabled || undefined}>
          {enabled ? "Live" : "Off"}
        </span>
        <span className={styles.modeChip}>{MODE_CHIP[type.accrualMode ?? ""] ?? "Legacy"}</span>
      </header>
      <fetcher.Form method="post" className={styles.form}>
        <input type="hidden" name="intent" value="save-type" />
        <input type="hidden" name="typeId" value={type.id} />
        <input type="hidden" name="mode" value={type.accrualMode ?? ""} />
        {daysDirty ? <input type="hidden" name="accrualDays" value={daysText} /> : null}
        {carryForward !== type.carryForward ? (
          <input type="hidden" name="carryForward" value={String(carryForward)} />
        ) : null}
        {allowOverBalance !== type.allowOverBalance ? (
          <input type="hidden" name="allowOverBalance" value={String(allowOverBalance)} />
        ) : null}
        {paid !== type.paid ? <input type="hidden" name="paid" value={String(paid)} /> : null}
        {enabled !== type.enabled ? (
          <input type="hidden" name="enabled" value={String(enabled)} />
        ) : null}

        <label className={dialogStyles.switchRow}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <span>
            Turn on this leave type
            <small>When it is off, staff cannot ask for or see it in their request options.</small>
          </span>
        </label>
        {!enabled ? (
          <p className={styles.offWarning} role="status">
            While it stays off, employees cannot see or request {type.name}. Existing approved leave
            stays recorded, but new requests are blocked.
          </p>
        ) : null}

        <label className={dialogStyles.switchRow}>
          <input
            type="checkbox"
            checked={paid}
            onChange={(event) => setPaid(event.target.checked)}
          />
          <span>
            Paid time off
            <small>
              {paid
                ? "Staff keep their regular pay on approved days."
                : "Unpaid — approved days count as loss of pay."}
            </small>
          </span>
        </label>

        {hasRate ? (
          <div className={styles.rateBlock}>
            <TextInput
              id={`${formId}-days`}
              label={monthly ? "Days given each month" : "Grant per year"}
              value={days}
              onChange={(value) => setDays(value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              autoComplete="off"
              maxLength={6}
              hint={
                monthly
                  ? "Credit added each month, April–March. 0 = none accrues."
                  : "The year's grant, added each April. 0 = none accrues."
              }
              error={daysText !== "" && !daysOk ? "Up to 366, at most 2 decimals." : undefined}
            />
            <div className={styles.presets} role="group" aria-label="Rate quick-sets">
              {RATE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  // The same value however it is written — "1.50" lights "1.5".
                  className={
                    daysText !== "" && Number(preset) === Number(daysText)
                      ? styles.presetActive
                      : styles.preset
                  }
                  onClick={() => setDays(preset)}
                >
                  {preset} {preset === "1" ? "day" : "days"}
                </button>
              ))}
            </div>
            {monthly && annualDays !== null ? (
              <p className={styles.convert} role="status">
                {daysText || "0"} day(s)/mo = {annualDays} days/yr
              </p>
            ) : null}
          </div>
        ) : (
          <p className={styles.noRate}>
            No rate — days come from approved comp-off earns, not a rate.
          </p>
        )}

        {monthly ? (
          <>
            <label className={dialogStyles.switchRow}>
              <input
                type="checkbox"
                checked={carryForward}
                onChange={(event) => setCarryForward(event.target.checked)}
              />
              <span>
                Move unused days to next year
                <small>Last year's unused days roll into this year's balance.</small>
              </span>
            </label>
            <label className={dialogStyles.switchRow}>
              <input
                type="checkbox"
                checked={allowOverBalance}
                onChange={(event) => setAllowOverBalance(event.target.checked)}
              />
              <span>
                Allow taking extra days
                <small>Requests may go past the remaining balance.</small>
              </span>
            </label>
          </>
        ) : null}

        {error ? (
          <p className={dialogStyles.dialogError} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          {saved && !dirty ? (
            <p className={dialogStyles.savedMark} role="status">
              Saved.
            </p>
          ) : null}
          <button
            type="submit"
            className={dialogStyles.saveButton}
            disabled={busy || !dirty || (hasRate && !daysOk)}
          >
            {busy ? <Spinner size={13} /> : null}
            {busy ? "Saving…" : `Save ${type.name}`}
          </button>
        </div>
      </fetcher.Form>
    </section>
  );
}
