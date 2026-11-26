import { Link, useLoaderData, useLocation, useNavigation } from "react-router";
import type { adminPayrollLoader } from "../features/admin/payrollLoaders";
import { RegionTableSkeleton } from "../features/admin/components/RegionSkeleton";
import { Tabs } from "../features/admin/components/Tabs";
import { SkeletonSlot } from "../components/ui/Skeleton";
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
  { value: "components", label: "Salary Components" },
  { value: "structures", label: "Salary Structure" },
  { value: "deductions", label: "Deductions" },
  { value: "statutory", label: "Government Rules" },
  { value: "calendar", label: "Salary Calendar" },
  { value: "runs", label: "Salary Runs" },
  { value: "audit", label: "History" },
];

export function AdminPayrollPage() {
  const data = useLoaderData<typeof adminPayrollLoader>();
  const location = useLocation();
  const navigation = useNavigation();
  // The panel region's load: every address change on this page (tab, month)
  // is a genuine refetch — while it persists past the delay the panel below
  // the tab strip stands in. A different page's navigation is the shell's
  // skeleton; a same-address revalidation (a run's action, a lock) keeps
  // the panel — its own busy states carry that.
  const regionPending =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname &&
    navigation.location?.search !== location.search;
  const pendingTab = regionPending
    ? new URLSearchParams(navigation.location?.search).get("tab")
    : null;

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
            Salary
            <span className={styles.rolePill}>
              <CrownIcon size={13} className={styles.rolePillIcon} />
              Owner
            </span>
          </h1>
          <p className={styles.lede}>
            Set up how employee salaries are calculated and paid. You can manage salary details,
            deductions, attendance and payment dates from here.
          </p>
        </div>
      </header>
      <Tabs
        basePath="/admin/company/payroll"
        tabs={TAB_LIST}
        current={
          pendingTab !== null && TAB_LIST.some((tab) => tab.value === pendingTab)
            ? pendingTab
            : data.tab
        }
      />
      <SkeletonSlot show={regionPending} skeleton={<RegionTableSkeleton rows={6} />}>
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
      </SkeletonSlot>
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
          Salary
        </span>
      </nav>
    </div>
  );
}
