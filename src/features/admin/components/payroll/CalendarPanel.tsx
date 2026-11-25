import { Form, useActionData, useFetcher, useNavigate, useNavigation } from "react-router";
import { useState } from "react";
import type { adminPayrollAction } from "../../payrollAction";
import type {
  PayrollCalendarView,
  PayrollMonthStatusView,
  PayrollStateRulesView,
} from "../../payrollViews";
import { fmtDay } from "../../format";
import { Spinner } from "../../../../components/ui/Spinner";
import { TextInput } from "../../../../components/ui/TextInput";
import { InfoTip } from "../../../../components/ui/InfoTip";
/* The example/table/list building blocks live with InfoTip, so every panel
   that renders structured tips shares one theme. */
import tipStyles from "../../../../components/ui/InfoTip.module.css";
import styles from "./CalendarPanel.module.css";

/**
 * The Calendar tab: the effective-dated salary rules (daily-calculation
 * method, attendance cut-off, payment date), a month probe that asks the BE
 * what one month actually resolves to, and the state's rules-notified flag.
 * Leaving a field empty on a save takes the default — the BE's full-envelope
 * contract, spelled out under the form.
 */

type SliceOf<T> = { ok: true; data: T } | { ok: false };

const DIVISOR_WORDS: Record<PayrollCalendarView["divisorConvention"], string> = {
  calendar: "Actual days in the month",
  "fixed-30": "Fixed 30 days",
  "fixed-26": "Fixed 26 days",
};

/** A YYYY-MM month as the owner reads it — "October 2026". */
function fmtMonthHead(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return month;
  return new Date(year, mon - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

/** A YYYY-MM-DD date spoken in full — "25 November 2026". */
function fmtFullDate(day: string): string {
  const at = new Date(`${day}T00:00:00`);
  return Number.isNaN(at.getTime())
    ? day
    : at.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

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
          We could not load the salary calendar. Please go back to the menu and open this page
          again.
        </p>
      </div>
    );
  }
  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <h2 className={styles.panelTitle}>Salary Calendar</h2>
        <p className={styles.panelLede}>
          Set how employee salaries are calculated, which day attendance is counted up to, and when
          salaries are paid. The latest saved rule that starts before or on the 1st of a month will
          be used for that month.
        </p>
        {calendar.data.length === 0 ? (
          <div className={styles.empty}>
            <p>
              No salary settings have been saved yet. The system will use these default settings:
            </p>
            <ul className={styles.emptyList}>
              <li>Salary calculation: 26 days</li>
              <li>Attendance cut-off: 25th</li>
              <li>Salary payment date: 1st</li>
            </ul>
          </div>
        ) : (
          <>
            <h3 className={styles.listTitle}>Saved Rules</h3>
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
          </>
        )}
        <CalendarSaveForm />
      </div>

      <div className={styles.card}>
        <h2 className={styles.panelTitle}>Check Salary Settings for a Month</h2>
        <p className={styles.panelLede}>
          Select any month to see how employee salaries will be calculated for that month.
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
            label="Select Month"
            type="month"
            value={probe}
            onChange={setProbe}
          />
          <button type="submit" className={styles.probeButton}>
            Check Month
          </button>
        </form>
        {monthStatus.ok && monthStatus.data !== null ? (
          <MonthStatusCard status={monthStatus.data} />
        ) : monthStatus.ok ? null : (
          <p className={styles.failed} role="alert">
            We could not check the salary details for this month. Please try again.
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
          label="Applies From"
          labelHint={
            <InfoTip label="When will this rule start?">
              Choose the date from which this new rule should start. The new rule will apply from
              the next month if you choose a date after the 1st.
              <p className={tipStyles.tipExample}>
                <strong>Example:</strong> If you save a new rule on 25th November, the old rule will
                continue for November. The new rule will start from 1st December.
              </p>
              <p className={tipStyles.tipExample}>
                <strong>In simple words:</strong> Choose the date when you want the new salary rule
                to start.
              </p>
            </InfoTip>
          }
          type="date"
          value={effectiveFrom}
          onChange={setEffectiveFrom}
        />
        <label className={styles.fieldLabel}>
          <span className={styles.labelRow}>
            Salary Calculation Method
            <InfoTip label="How is one day's salary calculated?">
              This tells the system how to calculate one day's salary from the monthly salary.
              <p className={tipStyles.tipExample}>
                <strong>Example:</strong> If monthly salary is ₹26,000: ₹26,000 ÷ 26 = ₹1,000 per
                day.
              </p>
              <span className={tipStyles.tipHeading}>Available options</span>
              <ul className={tipStyles.tipList}>
                <li>
                  <strong>Fixed 26 days</strong> — divide monthly salary by 26 to calculate one
                  day's salary.
                </li>
                <li>
                  <strong>Fixed 30 days</strong> — divide monthly salary by 30 to calculate one
                  day's salary.
                </li>
                <li>
                  <strong>Actual days in the month</strong> — divide salary by the actual number of
                  days in that month (28, 29, 30 or 31).
                </li>
                <li>
                  <strong>Use Default</strong> — let the system use the default setting (26 days).
                </li>
              </ul>
              <span className={tipStyles.tipHeading}>When does this matter?</span>
              <table className={tipStyles.tipMath}>
                <tbody>
                  <tr>
                    <th scope="row">No unpaid leave</th>
                    <td>Full salary of ₹26,000</td>
                  </tr>
                  <tr>
                    <th scope="row">2 unpaid leave days</th>
                    <td>₹2,000 will be deducted</td>
                  </tr>
                  <tr>
                    <th scope="row">Salary after deduction</th>
                    <td>₹24,000</td>
                  </tr>
                </tbody>
              </table>
              <p className={tipStyles.tipExample}>
                <strong>In simple words:</strong> This setting decides how much money will be
                deducted for each unpaid day.
              </p>
            </InfoTip>
          </span>
          <select
            name="divisorConvention"
            className={styles.select}
            value={divisor}
            onChange={(event) => setDivisor(event.target.value)}
          >
            <option value="">Use Default</option>
            <option value="fixed-26">Fixed 26 days</option>
            <option value="fixed-30">Fixed 30 days</option>
            <option value="calendar">Actual days in the month</option>
          </select>
        </label>
        <TextInput
          id="cal-cutoff"
          name="cutoffDay"
          label="Attendance Cut-off Day"
          labelHint={
            <InfoTip label="Which day will attendance be counted up to?">
              Choose the last day for counting attendance when calculating salary. Any leave or
              absence after this date will be counted in the next month's salary.
              <p className={tipStyles.tipExample}>
                <strong>Example:</strong> If the cut-off date is 25th: November salary will include
                attendance from 26th October to 25th November. If an employee is absent on 28th
                October, the deduction will be made from November's salary.
              </p>
              <p className={tipStyles.tipExample}>
                <strong>In simple words:</strong> This date decides which month's salary will
                include an employee's attendance, leave and absence.
              </p>
            </InfoTip>
          }
          inputMode="numeric"
          value={cutoff}
          onChange={(value) => setCutoff(value.replace(/\D/g, ""))}
          placeholder="25"
          maxLength={2}
          hint="Choose a date between 1 and 28."
        />
        <TextInput
          id="cal-pay"
          name="payDate"
          label="Salary Payment Date"
          labelHint={
            <InfoTip label="When will employees receive their salary?">
              Choose the date when employees will receive the previous month's salary.
              <p className={tipStyles.tipExample}>
                <strong>Example:</strong> If the payment date is 1: November salary will be paid on
                1st December. You can choose any date from 1st to 7th of the next month.
              </p>
              <p className={tipStyles.tipExample}>
                <strong>In simple words:</strong> This is the date when the salary will be sent to
                the employee's bank account.
              </p>
            </InfoTip>
          }
          inputMode="numeric"
          value={payDate}
          onChange={(value) => setPayDate(value.replace(/\D/g, ""))}
          placeholder="1"
          maxLength={2}
          hint="Choose a date between 1 and 7."
        />
      </div>
      <p className={styles.hint}>
        If you leave any field empty, the system will use its default setting. If you save another
        rule with the same date, the old rule will be completely replaced. Any empty fields in the
        new rule will use the default settings.
      </p>
      {result?.state === "error" ? (
        <p className={styles.errorLine} role="alert">
          {result.message}
        </p>
      ) : null}
      {result?.state === "done" ? (
        <p className={styles.savedLine} role="status">
          Salary settings saved successfully.
        </p>
      ) : null}
      <div className={styles.saveRow}>
        <button type="submit" className={styles.saveButton} disabled={busy}>
          {busy ? <Spinner size={13} /> : null}
          {busy ? "Saving…" : "Save Salary Settings"}
        </button>
      </div>
    </Form>
  );
}

function MonthStatusCard({ status }: { status: PayrollMonthStatusView }) {
  return (
    <div className={styles.statusCard}>
      <h3 className={styles.statusTitle}>{fmtMonthHead(status.month)}</h3>
      <dl className={styles.statusFacts}>
        <div>
          <dt>
            Daily Salary Calculation
            <InfoTip label="How is one day's salary calculated?">
              This shows the number used to divide the monthly salary to calculate one day's salary.
              <p className={tipStyles.tipExample}>
                <strong>Example:</strong> ₹26,000 ÷ 26 = ₹1,000 per day. If the employee works the
                full month without any unpaid leave, they will receive the full monthly salary.
              </p>
            </InfoTip>
          </dt>
          <dd>{DIVISOR_WORDS[status.divisorConvention]}</dd>
        </div>
        <div>
          <dt>
            Attendance Cut-off Day
            <InfoTip label="Which day is attendance counted up to?">
              This is the last day counted for this month's salary. Any attendance or leave after
              this date will be counted in the next month's salary.
              <p className={tipStyles.tipExample}>
                <strong>Example:</strong> If the cut-off is 25, this month's salary will count
                attendance from the 26th of the previous month to the 25th of this month.
              </p>
            </InfoTip>
          </dt>
          <dd>{status.cutoffDay}</dd>
        </div>
        <div>
          <dt>
            Salary Payment Date
            <InfoTip label="When will the salary be paid?">
              This is the date when employees will receive this month's salary in the next month.
              <p className={tipStyles.tipExample}>
                <strong>Example:</strong> If the payment date is 1, November's salary will be paid
                on 1st December.
              </p>
            </InfoTip>
          </dt>
          <dd>{status.payDate}</dd>
        </div>
        <div>
          <dt>
            Salary Rule Used
            <InfoTip label="Which salary rule is being used?">
              This shows which saved salary settings are being used for the selected month.
              <p className={tipStyles.tipExample}>
                <strong>Example:</strong> Rule from 1st November means the system is using the
                settings saved on 1st November. Default Settings means no special rule is saved for
                this month. The system uses the default settings: salary calculation 26 days,
                attendance cut-off 25th, salary payment date 1st.
              </p>
            </InfoTip>
          </dt>
          <dd>
            {status.effectiveFrom === null
              ? "Default Settings"
              : `Rule from ${fmtDay(status.effectiveFrom)}`}
          </dd>
        </div>
        <div>
          <dt>
            First Month Salary Can Be Paid
            <InfoTip label="When can salary processing start?">
              This shows the first month for which you can process employee salaries. It is based on
              the joining date of the earliest employee.
              <p className={tipStyles.tipExample}>
                <strong>Example:</strong> If the first month is September 2026, you can start
                processing salaries from September 2026.
              </p>
            </InfoTip>
          </dt>
          <dd>
            {status.firstPayrollMonth
              ? fmtMonthHead(status.firstPayrollMonth)
              : "No employee joining date has been added yet"}
          </dd>
        </div>
        <div>
          <dt>
            Is This Month Locked?
            <InfoTip label="What does Locked mean?">
              A locked month is already completed and cannot be changed or processed again. Once a
              month is locked, it cannot be unlocked.
              <p className={tipStyles.tipExample}>
                <strong>Example:</strong> If October 2026 is locked, you cannot change October's
                salary again. If you need to pay any extra amount or make a correction, you must add
                it to a later month's salary.
              </p>
            </InfoTip>
          </dt>
          <dd>
            {status.locked
              ? "Yes — This month is permanently locked."
              : "No — This month is not locked."}
          </dd>
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
      <h2 className={styles.panelTitle}>State Government Rules</h2>
      <p className={styles.panelLede}>
        Some states may have their own rules for PF or Professional Tax. When the government
        announces new rules for your state, tick the box below to mark that you have received the
        update. This is only a confirmation. It does not change how salary or deductions are
        calculated.
      </p>
      <fetcher.Form method="post" className={styles.saveForm}>
        <input type="hidden" name="intent" value="state-rules-save" />
        <input type="hidden" name="notified" value={String(notified)} />
        <p className={styles.currentState} role="status">
          {notified
            ? epoch
              ? "Government rules are marked as updated, but no update date is saved."
              : "Government rules have been updated."
            : "Not updated yet."}
        </p>
        <label className={styles.switchRow}>
          <input
            type="checkbox"
            checked={notified}
            onChange={(event) => setNotified(event.target.checked)}
          />
          <span>
            My state has announced new rules.
            <small>
              {epoch
                ? "You have not marked this as updated yet."
                : `Last updated on ${fmtFullDate(stateRules.updatedAt.slice(0, 10))}.`}
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
            Saved successfully.
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
