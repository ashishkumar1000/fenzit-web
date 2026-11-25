import { useFetcher } from "react-router";
import { useId, useState } from "react";
import type { ComponentType } from "react";
import {
  AlarmClockCheck,
  Banknote,
  CalendarPlus,
  Heart,
  Info,
  RotateCw,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  Umbrella,
  VenetianMask,
} from "lucide-react";
import type { LeaveTypeRow } from "../leaveApi";
import type { LeaveActionResult } from "../leaveLoaders";
import { Spinner } from "../../../components/ui/Spinner";
import dialogStyles from "./JobSettingsDialog.module.css";
import styles from "./LeaveTypeEditor.module.css";

const MODE_CHIP: Record<string, string> = {
  monthly: "Monthly accrual",
  annual: "Annual grant",
  none: "Event basis",
};

/** The header tile carries the same icon the type's card does. */
const CODE_GLYPH: Record<string, ComponentType<{ size?: number }>> = {
  earned: Umbrella,
  sick: VenetianMask,
  bereavement: Heart,
  comp_off: AlarmClockCheck,
};

/** The design's per-type explainer under the title. */
const CODE_BLURB: Record<string, string> = {
  earned: "Rules for vacation days earned and accumulated month-over-month.",
  sick: "Rules for paid sick days credited every month.",
  bereavement: "Rules for the year's bereavement grant.",
  comp_off: "Rules for comp-off days earned from extra hours worked.",
};

/** The rate quick-sets — one tap fills the input (the design's presets). */
const RATE_PRESETS = ["0", "1", "1.5", "2"];

function trimNum(text: string): string {
  return String(Number(Number(text).toFixed(2)));
}

/** The stepper's ±0.5 nudge, clamped to the same 0–366 range the input allows.
 *  A half-typed value ("12.") keeps its numeric head — only junk reads as 0. */
function stepDays(text: string, delta: number): string {
  const base = Number.parseFloat(text.trim()) || 0;
  return String(Math.min(366, Math.max(0, Number((base + delta).toFixed(2)))));
}

/** The design's pill switch — a `role="switch"` button, not a checkbox, so
 *  the accessibility tree reads the state the way the screen shows it. */
function Switch({
  checked,
  label,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={styles.switch}
      data-on={checked || undefined}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.switchKnob} />
    </button>
  );
}

/** One of the design's setting rows: a glyph tile, a title (with an optional
 *  state chip), a description, and the switch on the right. The row sleeps
 *  (dims and goes inert) while the type itself is off. */
function ToggleRow({
  glyph: Glyph,
  title,
  chip,
  description,
  checked,
  disabled,
  onChange,
}: {
  glyph: ComponentType<{ size?: number }>;
  title: string;
  chip?: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className={styles.row} data-disabled={disabled || undefined}>
      <span className={styles.rowGlyph} aria-hidden="true">
        <Glyph size={15} />
      </span>
      <div className={styles.rowText}>
        <span className={styles.rowTitle}>
          {title}
          {chip ? <span className={styles.rowChip}>{chip}</span> : null}
        </span>
        <small className={styles.rowDesc}>{description}</small>
      </div>
      <Switch checked={checked} label={title} disabled={disabled} onChange={onChange} />
    </div>
  );
}

/** The selected leave type's rules editor — the design's detail half. The
 *  enable switch lives in the header, and while it sits at off the rest of
 *  the form sleeps: employees can't see the type anyway, so its rules are
 *  not editable either. The save posts changed fields only — the same
 *  contract the backend's values-only PATCH keeps; the button sleeps until
 *  something changed. While the type sleeps only the enabled change posts —
 *  a rule drafted before the flip stays in its input and ships when the
 *  type wakes. */
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
  const asleep = !enabled;

  const busy = fetcher.state !== "idle";
  const saved = fetcher.data !== undefined && fetcher.data.state === "done";
  const error =
    fetcher.data !== undefined && fetcher.data.state === "error" ? fetcher.data.message : null;

  const Glyph = CODE_GLYPH[type.code ?? ""] ?? Umbrella;

  return (
    <section className={styles.editor} aria-label={`${type.name} rules`}>
      <header className={styles.head}>
        <span className={styles.headGlyph} aria-hidden="true" data-asleep={asleep || undefined}>
          <Glyph size={20} />
        </span>
        <div className={styles.headText}>
          <div className={styles.headTitleRow}>
            <h3 className={styles.title}>{type.name} rules</h3>
            <span className={styles.activeChip} data-live={enabled || undefined}>
              {enabled ? "Active Type" : "inactive"}
            </span>
            <span className={styles.modeChip}>{MODE_CHIP[type.accrualMode ?? ""] ?? "Legacy"}</span>
          </div>
          <p className={styles.blurb}>
            {CODE_BLURB[type.code ?? ""] ?? `How ${type.name} behaves for your team.`}
          </p>
        </div>
        <div className={styles.headEnd}>
          <span className={styles.schema}>
            <ShieldCheck size={12} aria-hidden="true" />
            Schema ID: {type.code ?? "—"}
          </span>
          <Switch checked={enabled} label={`Turn ${type.name} on or off`} onChange={setEnabled} />
        </div>
      </header>
      <fetcher.Form method="post" className={styles.form}>
        <input type="hidden" name="intent" value="save-type" />
        <input type="hidden" name="typeId" value={type.id} />
        <input type="hidden" name="mode" value={type.accrualMode ?? ""} />
        {/* Changed fields only — and while the type sleeps, the rule drafts
            hold: the wire carries the enabled change alone. */}
        {enabled && daysDirty ? <input type="hidden" name="accrualDays" value={daysText} /> : null}
        {enabled && carryForward !== type.carryForward ? (
          <input type="hidden" name="carryForward" value={String(carryForward)} />
        ) : null}
        {enabled && allowOverBalance !== type.allowOverBalance ? (
          <input type="hidden" name="allowOverBalance" value={String(allowOverBalance)} />
        ) : null}
        {enabled && paid !== type.paid ? (
          <input type="hidden" name="paid" value={String(paid)} />
        ) : null}
        {enabled !== type.enabled ? (
          <input type="hidden" name="enabled" value={String(enabled)} />
        ) : null}

        {!enabled ? (
          <p className={styles.offWarning} role="status">
            <TriangleAlert size={14} aria-hidden="true" />
            <span>
              Employees cannot see or request {type.name} while it stays off. Existing approved
              leave stays recorded, but new requests are blocked.
            </span>
          </p>
        ) : null}

        <ToggleRow
          glyph={Banknote}
          title="Paid time off"
          chip={paid ? "100% Compensation" : undefined}
          description={
            paid
              ? "Staff keep their regular pay on approved days."
              : "Unpaid — approved days count as loss of pay."
          }
          checked={paid}
          disabled={asleep}
          onChange={setPaid}
        />

        {hasRate ? (
          <div className={styles.rateBlock} data-disabled={asleep || undefined}>
            <div className={styles.rateHead}>
              <span className={styles.rowGlyph} aria-hidden="true">
                <CalendarPlus size={15} />
              </span>
              <div className={styles.rowText}>
                <label className={styles.rowTitle} htmlFor={`${formId}-days`}>
                  {monthly ? "Days given each month" : "Grant per year"}
                </label>
                <small className={styles.rowDesc}>
                  {monthly
                    ? "Monthly accrual rate per staff member (step 0.5)"
                    : "The year's grant, added each April"}
                </small>
              </div>
              {monthly && daysOk && daysText !== "" ? (
                <span className={styles.rateConvert} role="status">
                  <CalendarPlus size={12} aria-hidden="true" />
                  {trimNum(daysText)} day/mo = {annualDays} days/yr
                </span>
              ) : null}
            </div>
            <div className={styles.rateInputRow}>
              <span className={styles.stepper}>
                <button
                  type="button"
                  className={styles.step}
                  aria-label="Decrease days"
                  disabled={asleep}
                  onClick={() => setDays(stepDays(daysText, -0.5))}
                >
                  −
                </button>
                <input
                  id={`${formId}-days`}
                  className={styles.rateInput}
                  value={days}
                  onChange={(event) => setDays(event.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={6}
                  disabled={asleep}
                />
                <button
                  type="button"
                  className={styles.step}
                  aria-label="Increase days"
                  disabled={asleep}
                  onClick={() => setDays(stepDays(daysText, 0.5))}
                >
                  +
                </button>
              </span>
              <span className={styles.rateUnit}>{monthly ? "days / month" : "days / year"}</span>
              <div className={styles.presets} role="group" aria-label="Rate quick-sets">
                <span className={styles.presetsLabel}>Presets:</span>
                {RATE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={asleep}
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
            </div>
            {daysText !== "" && !daysOk ? (
              <p className={styles.rateError} role="alert">
                Up to 366, at most 2 decimals.
              </p>
            ) : null}
            <p className={styles.rateHint}>
              <Info size={13} aria-hidden="true" />
              <span>
                {monthly
                  ? "Added automatically on the 1st of every month. Set to 0 if automatic monthly accrual is disabled."
                  : "Credited once each April. Set to 0 if the annual grant is disabled."}
              </span>
            </p>
          </div>
        ) : (
          <p className={styles.noRate}>
            No rate — days come from approved comp-off earns, not a rate.
          </p>
        )}

        {monthly ? (
          <>
            <ToggleRow
              glyph={RotateCw}
              title="Move unused days to next year"
              description="Last year's unused days roll into this year's balance."
              checked={carryForward}
              disabled={asleep}
              onChange={setCarryForward}
            />
            <ToggleRow
              glyph={TrendingUp}
              title="Allow taking extra days"
              description="Requests may go past the remaining balance."
              checked={allowOverBalance}
              disabled={asleep}
              onChange={setAllowOverBalance}
            />
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
          {/* While asleep an invalid days draft must not block the disable —
              the gate only applies to the awake form. */}
          <button
            type="submit"
            className={dialogStyles.saveButton}
            disabled={busy || !dirty || (enabled && hasRate && !daysOk)}
          >
            {busy ? <Spinner size={13} /> : null}
            {busy ? "Saving…" : `Save ${type.name}`}
          </button>
        </div>
      </fetcher.Form>
    </section>
  );
}
