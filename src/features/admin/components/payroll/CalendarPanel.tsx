import { Form, useActionData, useFetcher, useNavigate, useNavigation } from "react-router";
import { useState } from "react";
import type { adminPayrollAction } from "../../payrollAction";
import type {
  PayrollCalendarView,
  PayrollMonthStatusView,
  PayrollStateRulesView,
} from "../../payrollViews";
import { Spinner } from "../../../../components/ui/Spinner";
import { TextInput } from "../../../../components/ui/TextInput";
import styles from "./CalendarPanel.module.css";

/**
 * The Calendar tab: the effective-dated payroll policy rows (divisor
 * convention, attendance cut-off, pay date), a month probe that asks the BE
 * what one month actually resolves to, and the state's rules-notified
 * flag. Leaving a field empty on a save takes the default — the BE's
 * full-envelope contract, spelled out under the form.
 */

type SliceOf<T> = { ok: true; data: T } | { ok: false };

const DIVISOR_WORDS: Record<PayrollCalendarView["divisorConvention"], string> = {
  calendar: "Calendar days of the month",
  "fixed-30": "Fixed 30 days",
  "fixed-26": "Fixed 26 days",
};

export function CalendarPanel({
  calendar,
  month,
  monthStatus,
  stateRules,
}: {
  calendar: SliceOf<PayrollCalendarView[]>;
  month: string | null;
  monthStatus: SliceOf<PayrollMonthStatusView | null>;
  stateRules: SliceOf<PayrollStateRulesView>;
}) {
  const navigate = useNavigate();
  const [probe, setProbe] = useState(month ?? "");
  if (!calendar.ok || !stateRules.ok) {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          The payroll calendar could not load. Try opening this page again from the menu.
        </p>
      </div>
    );
  }
  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <h2 className={styles.panelTitle}>Payroll calendar</h2>
        <p className={styles.panelLede}>
          How a month's pay is divided, which day attendance is cut off, and when pay goes out. The
          newest row at or before a month's first day governs that month; months before the first
          row run on the defaults.
        </p>
        {calendar.data.length === 0 ? (
          <p className={styles.empty}>
            No rows yet — months run on the defaults: fixed 26 divisor, cut-off on the 25th, pay on
            the 1st.
          </p>
        ) : (
          <ul className={styles.configRows}>
            {calendar.data.map((row) => (
              <li key={row.effectiveFrom} className={styles.configRow}>
                <span>
                  From <strong className={styles.rowDate}>{row.effectiveFrom}</strong>
                </span>
                <span>{DIVISOR_WORDS[row.divisorConvention]}</span>
                <span>Cut-off {row.cutoffDay}</span>
                <span>Pay on {row.payDate}</span>
              </li>
            ))}
          </ul>
        )}
        <CalendarSaveForm />
      </div>

      <div className={styles.card}>
        <h2 className={styles.panelTitle}>What does a month look like?</h2>
        <p className={styles.panelLede}>
          Ask about any month — the answer shows the policy it resolves to and whether it can run
          yet.
        </p>
        <form
          className={styles.probeRow}
          onSubmit={(event) => {
            event.preventDefault();
            navigate(
              probe === ""
                ? "/admin/company/payroll?tab=calendar"
                : `/admin/company/payroll?tab=calendar&month=${probe}`,
            );
          }}
        >
          <TextInput
            id="month-probe"
            label="Month"
            type="month"
            value={probe}
            onChange={setProbe}
          />
          <button type="submit" className={styles.probeButton}>
            Check
          </button>
        </form>
        {monthStatus.ok && monthStatus.data !== null ? (
          <MonthStatusCard status={monthStatus.data} />
        ) : monthStatus.ok ? null : (
          <p className={styles.failed} role="alert">
            The month could not be checked. Try again.
          </p>
        )}
      </div>

      <StateRulesCard stateRules={stateRules.data} />
    </div>
  );
}

function CalendarSaveForm() {
  const action = useActionData<typeof adminPayrollAction>();
  const result = action !== undefined && isCalendarResult(action, "calendar-save") ? action : null;
  const busy = useNavigation().state !== "idle";
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [divisor, setDivisor] = useState("");
  const [cutoff, setCutoff] = useState("");
  const [payDate, setPayDate] = useState("");
  return (
    <Form method="post" className={styles.saveForm}>
      <input type="hidden" name="intent" value="calendar-save" />
      <div className={styles.fieldGrid}>
        <TextInput
          id="cal-date"
          name="effectiveFrom"
          label="Applies from"
          type="date"
          value={effectiveFrom}
          onChange={setEffectiveFrom}
        />
        <label className={styles.fieldLabel}>
          Divisor convention
          <select
            name="divisorConvention"
            className={styles.select}
            value={divisor}
            onChange={(event) => setDivisor(event.target.value)}
          >
            <option value="">(use the default)</option>
            <option value="fixed-26">Fixed 26 days</option>
            <option value="fixed-30">Fixed 30 days</option>
            <option value="calendar">Calendar days of the month</option>
          </select>
        </label>
        <TextInput
          id="cal-cutoff"
          name="cutoffDay"
          label="Attendance cut-off day"
          inputMode="numeric"
          value={cutoff}
          onChange={(value) => setCutoff(value.replace(/\D/g, ""))}
          placeholder="25"
          maxLength={2}
          hint="1–28, because February."
        />
        <TextInput
          id="cal-pay"
          name="payDate"
          label="Pay day of the month"
          inputMode="numeric"
          value={payDate}
          onChange={(value) => setPayDate(value.replace(/\D/g, ""))}
          placeholder="1"
          maxLength={2}
          hint="1–7, inside the wages Act's window."
        />
      </div>
      <p className={styles.hint}>
        A field left empty keeps the default for this row. Saving the same date replaces that row in
        full — absent fields fall back to the defaults, not to the row they replace.
      </p>
      {result?.state === "error" ? (
        <p className={styles.errorLine} role="alert">
          {result.message}
        </p>
      ) : null}
      {result?.state === "done" ? (
        <p className={styles.savedLine} role="status">
          Calendar row saved.
        </p>
      ) : null}
      <div className={styles.saveRow}>
        <button type="submit" className={styles.saveButton} disabled={busy}>
          {busy ? <Spinner size={13} /> : null}
          {busy ? "Saving…" : "Save calendar row"}
        </button>
      </div>
    </Form>
  );
}

function MonthStatusCard({ status }: { status: PayrollMonthStatusView }) {
  return (
    <div className={styles.statusCard}>
      <h3 className={styles.statusTitle}>{status.month}</h3>
      <dl className={styles.statusFacts}>
        <div>
          <dt>Divisor</dt>
          <dd>{DIVISOR_WORDS[status.divisorConvention]}</dd>
        </div>
        <div>
          <dt>Cut-off</dt>
          <dd>{status.cutoffDay}</dd>
        </div>
        <div>
          <dt>Pay date</dt>
          <dd>{status.payDate}</dd>
        </div>
        <div>
          <dt>Governed by</dt>
          <dd>
            {status.effectiveFrom === null ? "The defaults" : `Row from ${status.effectiveFrom}`}
          </dd>
        </div>
        <div>
          <dt>First payable month</dt>
          <dd>{status.firstPayrollMonth ?? "Nobody has a joining date yet"}</dd>
        </div>
        <div>
          <dt>Locked</dt>
          <dd>{status.locked ? "Yes — permanently" : "No"}</dd>
        </div>
      </dl>
      {status.notRunnableReason !== null ? (
        <p className={styles.reasonLine} role="status">
          {status.notRunnableReason}
        </p>
      ) : null}
    </div>
  );
}

function StateRulesCard({ stateRules }: { stateRules: PayrollStateRulesView }) {
  const fetcher = useFetcher<typeof adminPayrollAction>();
  const [notified, setNotified] = useState(stateRules.notified);
  const busy = fetcher.state !== "idle";
  const result =
    fetcher.data !== undefined && isCalendarResult(fetcher.data, "state-rules-save")
      ? fetcher.data
      : null;
  const epoch = stateRules.updatedAt.startsWith("1970");
  return (
    <div className={styles.card}>
      <h2 className={styles.panelTitle}>State rules</h2>
      <p className={styles.panelLede}>
        Has your state notified its own PF or profession-tax rules this year? Mark it once the
        notification lands — it is a bookkeeping flag, not a computation switch.
      </p>
      <fetcher.Form method="post" className={styles.saveForm}>
        <input type="hidden" name="intent" value="state-rules-save" />
        <input type="hidden" name="notified" value={String(notified)} />
        <p className={styles.currentState} role="status">
          {notified ? "Marked as notified" : "Not marked"}
          {epoch ? " (never set)" : ""}
        </p>
        <label className={styles.switchRow}>
          <input
            type="checkbox"
            checked={notified}
            onChange={(event) => setNotified(event.target.checked)}
          />
          <span>
            The state has notified its rules
            <small>
              {epoch
                ? "No mark has been saved yet."
                : `Last saved ${stateRules.updatedAt.slice(0, 10)}.`}
            </small>
          </span>
        </label>
        {result?.state === "error" ? (
          <p className={styles.errorLine} role="alert">
            {result.message}
          </p>
        ) : null}
        {result?.state === "done" ? (
          <p className={styles.savedLine} role="status">
            Saved.
          </p>
        ) : null}
        <div className={styles.saveRow}>
          <button type="submit" className={styles.saveButton} disabled={busy}>
            {busy ? <Spinner size={13} /> : null}
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}

type CalendarResult =
  { kind: string; state: "done" } | { kind: string; state: "error"; message: string };

function isCalendarResult(data: unknown, kind: string): data is CalendarResult {
  if (typeof data !== "object" || data === null) return false;
  return (data as { kind?: unknown }).kind === kind;
}
