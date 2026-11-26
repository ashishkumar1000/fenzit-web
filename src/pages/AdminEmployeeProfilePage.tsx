import {
  Link,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigation,
  useRevalidator,
  useParams,
} from "react-router";
import { useRef, useState } from "react";
import type {
  employeeProfileAction,
  employeeProfileLoader,
} from "../features/admin/employeeProfileLoaders";
import type { payrollEmploymentLoader } from "../features/admin/payrollLoaders";
import {
  EMPLOYMENT_RESOURCE_PATH,
  EmploymentDialog,
} from "../features/admin/components/payroll/EmploymentDialog";
import { Tabs } from "../features/admin/components/Tabs";
import { Avatar } from "../features/admin/components/Avatar";
import { Badge } from "../features/admin/components/Badge";
import { StatusBadge } from "../features/admin/components/Badge";
import { Button } from "../components/ui/Button";
import { LinkButton } from "../components/ui/LinkButton";
import { MasterRecordPanel } from "../features/admin/components/employee/MasterRecordPanel";
import { ProfileJobsPanel } from "../features/admin/components/employee/ProfileJobsPanel";
import { ProfileAttendancePanel } from "../features/admin/components/employee/ProfileAttendancePanel";
import { ProfileLeavePanel } from "../features/admin/components/employee/ProfileLeavePanel";
import { ProfilePayrollPanel } from "../features/admin/components/employee/ProfilePayrollPanel";
import {
  RegionFormSkeleton,
  RegionTableSkeleton,
} from "../features/admin/components/RegionSkeleton";
import { SkeletonSlot } from "../components/ui/Skeleton";
import { EMPLOYEE_PROFILE_TABS } from "../features/admin/employeeProfileLabels";
import { fmtIstDay, fmtPhone } from "../features/admin/format";
import styles from "./AdminEmployeeProfilePage.module.css";

/**
 * One employee's profile: the header card (identity, flags, the actions the
 * owner can take from here) and five tabs — Master Record, Jobs, Attendance,
 * Leave, Payroll — the loader fetching only the addressed tab's data. The
 * employment dialog is the same one the team list uses (one editor, one
 * place statutory fields ever appear); deactivate/reinstate posts to this
 * route and the address's own action refetches the page.
 */
export function AdminEmployeeProfilePage() {
  const data = useLoaderData<typeof employeeProfileLoader>();
  const revalidator = useRevalidator();
  const activate = useFetcher<typeof employeeProfileAction>();
  const employment = useFetcher<typeof payrollEmploymentLoader>();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogOpenCount, setDialogOpenCount] = useState(0);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  // Mid-save the employment dialog locks (CAP-5): backdrop click and Esc
  // cannot dismiss it while the details post.
  const [dialogLocked, setDialogLocked] = useState(false);
  // Read before the not-found/failed early returns below — hooks must run
  // on every render, and the panel's pending state is only consulted past
  // them.
  const location = useLocation();
  const navigation = useNavigation();

  if (data.state === "not-found") {
    return (
      <main className={styles.main}>
        <h1 className={styles.heading}>Employee</h1>
        <p className={styles.error} role="alert">
          This person is no longer in your team, or the link may be incorrect.
        </p>
        <LinkButton to="/admin/company/employees" variant="secondary">
          Back to All Employees
        </LinkButton>
      </main>
    );
  }
  if (data.state === "failed") {
    return (
      <main className={styles.main}>
        <h1 className={styles.heading}>Employee</h1>
        <p className={styles.error} role="alert">
          We could not load this page. Please check your internet connection and try again.
        </p>
        <Button onClick={() => revalidator.revalidate()} disabled={revalidator.state !== "idle"}>
          {revalidator.state !== "idle" ? "Loading…" : "Try Again"}
        </Button>
      </main>
    );
  }

  const { member, selfUserId } = data;
  const basePath = `/admin/company/employees/${member.userId}`;
  const activateBusy = activate.state !== "idle";
  const activateError = activate.data?.state === "error" ? activate.data.message : null;
  // The panel region's load: the route refetches only when the addressed
  // tab or month moved (the route's shouldRevalidate serves everything
  // else), so only those moves stand the panel below the tab strip in —
  // the header card above it stays put. The strip follows the tab being
  // loaded while the panel holds.
  const currentParams = new URLSearchParams(location.search);
  const navSearch =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname &&
    navigation.location?.search !== location.search
      ? navigation.location?.search
      : null;
  const pendingTab = navSearch === null ? null : new URLSearchParams(navSearch).get("tab");
  const pendingMonth = navSearch === null ? null : new URLSearchParams(navSearch).get("month");
  const regionPending =
    navSearch !== null &&
    (pendingTab !== currentParams.get("tab") || pendingMonth !== currentParams.get("month"));
  const openEmployment = () => {
    setDialogOpenCount((count) => count + 1);
    employment.load(`${EMPLOYMENT_RESOURCE_PATH}?userId=${member.userId}`);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <TopBar />
      <header className={styles.pageHead}>
        <div className={styles.identity}>
          <Avatar name={member.name} imageUrl={member.avatarUrl} />
          <div className={styles.identityText}>
            <h1 className={styles.heading}>
              <span className={styles.nameText}>{member.name ?? "No Name."}</span>
              <span className={styles.codeChip}>{member.employeeCode}</span>
              <StatusBadge status={member.status} />
            </h1>
            <p className={styles.meta}>
              Joined {fmtIstDay(member.createdAt)} ·{" "}
              {fmtPhone(member.countryCode, member.phoneNumber)}
              <button type="button" className={styles.quietAction} onClick={openEmployment}>
                + Add Job Title
              </button>
            </p>
            <div className={styles.badges}>
              {member.canCreateJobs ? <Badge label="Can Create Jobs" tone="primary" /> : null}
              {member.jobApprovalRequired ? (
                <Badge label="Needs Approval for Jobs" tone="scheduled" />
              ) : null}
              {member.role === "company_admin" ? <Badge label="Owner" tone="primary" /> : null}
              {member.role === "viewer" ? <Badge label="Viewer" tone="neutral" /> : null}
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <LinkButton to={`/admin/company/jobs/new?technician=${member.userId}`} variant="primary">
            Assign Job
          </LinkButton>
          <Button variant="secondary" onClick={openEmployment}>
            Edit Profile
          </Button>
          {member.userId !== selfUserId && member.status !== "invited" ? (
            confirmDeactivate && member.status === "active" ? (
              // The confirm pair only lives while the member is still active —
              // once the action lands and the page reloads as deactivated, the
              // reinstate state takes over without any state to reset.
              // The confirm step posts the park through the route's own
              // action — a form, never a JSON submit, so the action reads
              // plain form fields (the ResendCell idiom).
              <span className={styles.confirmPair}>
                <activate.Form method="post">
                  <input type="hidden" name="intent" value="activate" />
                  <input type="hidden" name="active" value="false" />
                  <button type="submit" className={styles.confirmDanger} disabled={activateBusy}>
                    {activateBusy ? "Working…" : "Confirm Deactivation"}
                  </button>
                </activate.Form>
                <Button
                  variant="secondary"
                  disabled={activateBusy}
                  onClick={() => setConfirmDeactivate(false)}
                >
                  Cancel
                </Button>
              </span>
            ) : member.status === "active" ? (
              <Button
                variant="secondary"
                disabled={activateBusy}
                onClick={() => setConfirmDeactivate(true)}
              >
                Deactivate
              </Button>
            ) : (
              <activate.Form method="post">
                <input type="hidden" name="intent" value="activate" />
                <input type="hidden" name="active" value="true" />
                <button type="submit" className={styles.reinstateButton} disabled={activateBusy}>
                  {activateBusy ? "Working…" : "Activate Again"}
                </button>
              </activate.Form>
            )
          ) : null}
        </div>
        {activateError !== null ? (
          <p className={styles.actionError} role="alert">
            {activateError}
          </p>
        ) : null}
      </header>
      <Tabs
        basePath={basePath}
        tabs={[...EMPLOYEE_PROFILE_TABS]}
        current={
          pendingTab !== null && EMPLOYEE_PROFILE_TABS.some((tab) => tab.value === pendingTab)
            ? pendingTab
            : data.tab
        }
      />
      <SkeletonSlot
        show={regionPending}
        className={styles.regionStack}
        skeleton={<ProfileSkeleton tab={pendingTab ?? data.tab} />}
      >
        {data.tab === "master" ? (
          <MasterRecordPanel
            employment={data.employment}
            skills={member.skills}
            openEmployment={openEmployment}
          />
        ) : null}
        {data.tab === "jobs" ? <ProfileJobsPanel jobs={data.jobs} /> : null}
        {data.tab === "attendance" ? (
          <ProfileAttendancePanel
            memberName={member.name ?? "this employee"}
            basePath={basePath}
            month={data.month}
            enrolment={data.enrolment}
            office={data.office}
            punches={data.punches}
          />
        ) : null}
        {data.tab === "leave" ? (
          <ProfileLeavePanel balances={data.balances} requests={data.requests} />
        ) : null}
        {data.tab === "payroll" ? (
          <ProfilePayrollPanel
            memberUserId={member.userId}
            structures={data.structures}
            payslips={data.payslips}
          />
        ) : null}
      </SkeletonSlot>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={`Employment details for ${member.name ?? "employee"}`}
        onCancel={(event) => {
          if (dialogLocked) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current && !dialogLocked) dialogRef.current?.close();
        }}
      >
        {dialogOpenCount > 0 ? (
          <EmploymentDialog
            key={dialogOpenCount}
            result={employment.data ?? { state: "loading" }}
            close={() => dialogRef.current?.close()}
            setLocked={setDialogLocked}
          />
        ) : null}
      </dialog>
    </>
  );
}

/** The profile panel's stand-in, shaped by the tab being loaded: the master
 *  record is a form, the attendance panel a ledger, the rest lists — the
 *  footprint each panel fills. */
function ProfileSkeleton({ tab }: { tab: string }) {
  if (tab === "master") return <RegionFormSkeleton fields={6} />;
  if (tab === "attendance") return <RegionTableSkeleton rows={5} columns={[1.4, 2.2, 1.4, 1]} />;
  return <RegionTableSkeleton rows={7} columns={[2, 1.2, 1.2, 1]} />;
}

function TopBar() {
  const params = useParams();
  return (
    <div className={styles.topBar}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link to="/admin" className={styles.crumbRoot}>
          Console
        </Link>
        <span className={styles.crumbSep} aria-hidden="true">
          ›
        </span>
        <Link to="/admin/company/employees" className={styles.crumbRoot}>
          Employees
        </Link>
        <span className={styles.crumbSep} aria-hidden="true">
          ›
        </span>
        <span className={styles.crumbHere} aria-current="page">
          {params.userId === undefined ? "Employee" : "Profile"}
        </span>
      </nav>
    </div>
  );
}
