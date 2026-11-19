import { Link, useLoaderData } from "react-router";
import type { adminPayrollLoader } from "../features/admin/payrollLoaders";
import { Tabs } from "../features/admin/components/Tabs";
import { CrownIcon } from "../components/ui/consoleIcons";
import { ComponentsPanel } from "../features/admin/components/payroll/ComponentsPanel";
import { StructuresPanel } from "../features/admin/components/payroll/StructuresPanel";
import { DeductionsPanel } from "../features/admin/components/payroll/DeductionsPanel";
import { StatutoryPanel } from "../features/admin/components/payroll/StatutoryPanel";
import { CalendarPanel } from "../features/admin/components/payroll/CalendarPanel";
import { RunsPanel } from "../features/admin/components/payroll/RunsPanel";
import { AuditPanel } from "../features/admin/components/payroll/AuditPanel";
import styles from "./AdminPayrollPage.module.css";

/**
 * The payroll page: seven tabs, one per concern — the jobs page's idiom,
 * where the URL's `?tab=` picks the section and the loader fetches only
 * what the section shows. Components/Structures/Deductions/Statutory/
 * Calendar configure payroll; Runs and Audit are its day-two record.
 */

const TAB_LIST = [
  { value: "components", label: "Components" },
  { value: "structures", label: "Structures" },
  { value: "deductions", label: "Deductions" },
  { value: "statutory", label: "Statutory" },
  { value: "calendar", label: "Calendar" },
  { value: "runs", label: "Runs" },
  { value: "audit", label: "Audit" },
];

export function AdminPayrollPage() {
  const data = useLoaderData<typeof adminPayrollLoader>();

  if (data.state === "failed") {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          This page could not load. Try opening it again from the menu.
        </p>
      </div>
    );
  }

  return (
    <>
      <TopBar />
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.heading}>
            Payroll
            <span className={styles.rolePill}>
              <CrownIcon size={13} className={styles.rolePillIcon} />
              Owner
            </span>
          </h1>
          <p className={styles.lede}>
            Set up pay once — components, structures, deductions and the statutory switches the
            monthly run reads.
          </p>
        </div>
      </header>
      <Tabs basePath="/admin/company/payroll" tabs={TAB_LIST} current={data.tab} />
      {data.tab === "components" ? <ComponentsPanel components={data.components} /> : null}
      {data.tab === "structures" ? (
        <StructuresPanel
          members={data.members}
          employee={data.employee}
          structures={data.structures}
          components={data.components}
        />
      ) : null}
      {data.tab === "deductions" ? <DeductionsPanel heads={data.heads} /> : null}
      {data.tab === "statutory" ? (
        <StatutoryPanel
          members={data.members}
          pfRows={data.pfRows}
          tds={data.tds}
          pfEmployee={data.pfEmployee}
          pfExclusion={data.pfExclusion}
        />
      ) : null}
      {data.tab === "calendar" ? (
        <CalendarPanel
          calendar={data.calendar}
          month={data.month}
          monthStatus={data.monthStatus}
          stateRules={data.stateRules}
        />
      ) : null}
      {data.tab === "runs" ? (
        <RunsPanel
          month={data.month}
          monthStatus={data.monthStatus}
          run={data.run}
          runStale={data.runStale}
          history={data.history}
          lock={data.lock}
          offCycleLines={data.offCycleLines}
          members={data.members}
        />
      ) : null}
      {data.tab === "audit" ? <AuditPanel entries={data.entries} members={data.members} /> : null}
    </>
  );
}

function TopBar() {
  return (
    <div className={styles.topBar}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link to="/admin" className={styles.crumbRoot}>
          Console
        </Link>
        <span className={styles.crumbSep} aria-hidden="true">
          ›
        </span>
        <span className={styles.crumbHere} aria-current="page">
          Payroll
        </span>
      </nav>
    </div>
  );
}
