import { Form, useActionData, useFetcher, useNavigate, useNavigation } from "react-router";
import { useState } from "react";
import type { adminPayrollAction } from "../../payrollAction";
import { fmtMoney } from "../../payrollFormat";
import type {
  PayrollPfConfigView,
  PayrollPfExclusionView,
  TdsConfigView,
} from "../../payrollViews";
import type { MemberRow } from "../../companyApi";
import { Dropdown } from "../Dropdown";
import { Spinner } from "../../../../components/ui/Spinner";
import { TextInput } from "../../../../components/ui/TextInput";
import styles from "./StatutoryPanel.module.css";

/**
 * The Statutory tab: the PF-covered switch (effective-dated rows; an empty
 * list means PF is off except for ever-members — anyone carrying a UAN or
 * PF account number), per-employee exclusions for the never-members, and
 * the read-only TDS constants. Statute lives on the BE; this tab only sets
 * the company's choices and shows what the law fixes.
 */

type SliceOf<T> = { ok: true; data: T } | { ok: false };

export function StatutoryPanel({
  members,
  pfRows,
  tds,
  pfEmployee,
  pfExclusion,
}: {
  members: SliceOf<MemberRow[]>;
  pfRows: SliceOf<PayrollPfConfigView[]>;
  tds: SliceOf<TdsConfigView>;
  pfEmployee: MemberRow | null;
  pfExclusion: SliceOf<PayrollPfExclusionView | null>;
}) {
  const navigate = useNavigate();
  if (!members.ok || !pfRows.ok || !tds.ok) {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          The statutory settings could not load. Try opening this page again from the menu.
        </p>
      </div>
    );
  }
  const roster = members.data.filter((m) => m.role === "employee" && m.status !== "removed");
  return (
    <div className={styles.stack}>
      <PfSwitchCard pfRows={pfRows.data} />
      <PfExclusionCard
        key={pfEmployee?.userId ?? "none"}
        roster={roster}
        pfEmployee={pfEmployee}
        pfExclusion={pfExclusion}
        onPick={(userId) =>
          navigate(
            userId === ""
              ? "/admin/company/payroll?tab=statutory"
              : `/admin/company/payroll?tab=statutory&pfEmployee=${userId}`,
          )
        }
      />
      <TdsCard tds={tds.data} />
    </div>
  );
}

function PfSwitchCard({ pfRows }: { pfRows: PayrollPfConfigView[] }) {
  const action = useActionData<typeof adminPayrollAction>();
  const result =
    action !== undefined && isStatutoryResult(action, "pf-config-save") ? action : null;
  const busy = useNavigation().state !== "idle";
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [covered, setCovered] = useState("true");
  return (
    <div className={styles.card}>
      <h2 className={styles.panelTitle}>Provident Fund</h2>
      <p className={styles.panelLede}>
        PF is 12% of earned Basic, up to the statutory wage ceiling. Employees with a UAN or PF
        number are always covered; this switch covers everyone else from a date.
      </p>
      {pfRows.length === 0 ? (
        <p className={styles.empty}>
          The switch is off — only employees with a UAN or PF account number are covered.
        </p>
      ) : (
        <ul className={styles.configRows}>
          {pfRows.map((row) => (
            <li key={row.effectiveFrom} className={styles.configRow}>
              <span>
                From <strong className={styles.rowDate}>{row.effectiveFrom}</strong>
              </span>
              <span className={styles.statePill} data-covered={row.covered ? "on" : "off"}>
                {row.covered ? "Covered" : "Not covered"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Form method="post" className={styles.saveForm}>
        <input type="hidden" name="intent" value="pf-config-save" />
        <TextInput
          id="pf-effective"
          name="effectiveFrom"
          label="Covered from"
          type="date"
          value={effectiveFrom}
          onChange={setEffectiveFrom}
        />
        <label className={styles.fieldLabel}>
          Coverage
          <select
            name="covered"
            className={styles.select}
            value={covered}
            onChange={(event) => setCovered(event.target.value)}
          >
            <option value="true">Cover employees</option>
            <option value="false">Do not cover employees</option>
          </select>
        </label>
        {result?.state === "error" ? (
          <p className={styles.errorLine} role="alert">
            {result.message}
          </p>
        ) : null}
        {result?.state === "done" ? (
          <p className={styles.savedLine} role="status">
            PF switch saved.
          </p>
        ) : null}
        <div className={styles.saveRow}>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={busy || effectiveFrom === ""}
          >
            {busy ? <Spinner size={13} /> : null}
            {busy ? "Saving…" : "Save PF switch"}
          </button>
        </div>
      </Form>
    </div>
  );
}

function PfExclusionCard({
  roster,
  pfEmployee,
  pfExclusion,
  onPick,
}: {
  roster: MemberRow[];
  pfEmployee: MemberRow | null;
  pfExclusion: SliceOf<PayrollPfExclusionView | null>;
  onPick: (userId: string) => void;
}) {
  const fetcher = useFetcher<typeof adminPayrollAction>();
  // The toggle follows the picked employee: a render-phase reset (the
  // JobSettingsCell idiom) when the pick changes, so a previous employee's
  // choice never bleeds into the next card.
  const [seenEmployee, setSeenEmployee] = useState<string | null>(pfEmployee?.userId ?? null);
  const [excluded, setExcluded] = useState<boolean | null>(null);
  const pickedId = pfEmployee?.userId ?? null;
  if (pickedId !== seenEmployee) {
    setSeenEmployee(pickedId);
    setExcluded(null);
  }
  const loadedExcluded =
    pfExclusion.ok && pfExclusion.data !== null ? pfExclusion.data.excluded : false;
  const current = excluded ?? loadedExcluded;
  const busy = fetcher.state !== "idle";
  const result =
    fetcher.data !== undefined && isStatutoryResult(fetcher.data, "pf-exclusion-save")
      ? fetcher.data
      : null;
  const epoch =
    pfExclusion.ok && pfExclusion.data !== null
      ? pfExclusion.data.updatedAt.startsWith("1970")
      : false;
  return (
    <div className={styles.card}>
      <h2 className={styles.panelTitle}>PF exclusions</h2>
      <p className={styles.panelLede}>
        Take one employee out of PF — for someone the EPFO does not cover even without a UAN. An
        employee carrying a UAN or PF account number cannot be excluded.
      </p>
      <div className={styles.pickerRow}>
        <Dropdown
          label="Employee"
          options={roster.map((m) => ({
            value: m.userId,
            label: m.name ?? "(no name)",
            meta: m.employeeCode,
          }))}
          value={pfEmployee?.userId ?? ""}
          onChange={onPick}
        />
      </div>
      {pfEmployee === null ? (
        <p className={styles.empty}>Pick an employee to see their PF exclusion.</p>
      ) : !pfExclusion.ok ? (
        <p className={styles.failed} role="alert">
          {pfEmployee.name ?? "This employee"}'s exclusion could not load. Try again.
        </p>
      ) : (
        <fetcher.Form method="post" className={styles.saveForm}>
          <input type="hidden" name="intent" value="pf-exclusion-save" />
          <input type="hidden" name="userId" value={pfEmployee.userId} />
          <input type="hidden" name="excluded" value={String(current)} />
          <p className={styles.currentState} role="status">
            {pfEmployee.name ?? "This employee"} is{" "}
            <strong>{current ? "excluded from PF" : "covered by PF"}</strong>
            {epoch ? " (never set)" : ""}
          </p>
          <label className={styles.switchRow}>
            <input
              type="checkbox"
              checked={current}
              onChange={(event) => setExcluded(event.target.checked)}
            />
            <span>
              Exclude from PF
              <small>
                {current
                  ? "PF stops on the next run; nothing is deducted."
                  : "12% of earned Basic is deducted each covered month."}
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
              {busy ? "Saving…" : "Save exclusion"}
            </button>
          </div>
        </fetcher.Form>
      )}
    </div>
  );
}

function TdsCard({ tds }: { tds: TdsConfigView }) {
  return (
    <div className={styles.card}>
      <h2 className={styles.panelTitle}>Tax deducted at source — {tds.taxYear}</h2>
      <p className={styles.panelLede}>
        Read-only: these are the statute's numbers ({tds.regime}), not company settings. TDS spreads
        the year's estimate evenly over the remaining months of the tax year.
      </p>
      <table className={styles.slabTable}>
        <thead>
          <tr>
            <th scope="col">Annual income up to</th>
            <th scope="col">Rate</th>
          </tr>
        </thead>
        <tbody>
          {tds.slabs.map((slab) => (
            <tr key={slab.ratePercent}>
              <td>{slab.upto === null ? "Above the last slab" : fmtMoney(String(slab.upto))}</td>
              <td>{slab.ratePercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className={styles.tdsFacts}>
        <div>
          <dt>Standard deduction</dt>
          <dd>{fmtMoney(tds.standardDeduction)}</dd>
        </div>
        <div>
          <dt>Rebate — section {tds.rebate.section}</dt>
          <dd>
            {fmtMoney(String(tds.rebate.threshold))} ({tds.rebate.description})
          </dd>
        </div>
        <div>
          <dt>Cess</dt>
          <dd>{tds.cessRatePercent}%</dd>
        </div>
      </dl>
    </div>
  );
}

type StatutoryResult =
  { kind: string; state: "done" } | { kind: string; state: "error"; message: string };

function isStatutoryResult(data: unknown, kind: string): data is StatutoryResult {
  if (typeof data !== "object" || data === null) return false;
  return (data as { kind?: unknown }).kind === kind;
}
