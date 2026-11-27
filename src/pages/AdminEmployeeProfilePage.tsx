import {
  Link,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigation,
  useRevalidator,
} from "react-router";
import { Calendar, Pencil, Phone, Plus, TriangleAlert, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import type {
  employeeProfileAction,
  employeeProfileLoader,
} from "../features/admin/employeeProfileLoaders";
import type { payrollEmploymentLoader } from "../features/admin/payrollLoaders";
import { EmploymentDialog } from "../features/admin/components/payroll/EmploymentDialog";
import { EMPLOYMENT_RESOURCE_PATH } from "../features/admin/employmentResource";
import type { EmploymentSection } from "../features/admin/employmentSections";
import dialogStyles from "../features/admin/components/JobSettingsDialog.module.css";
import employmentDialogStyles from "../features/admin/components/payroll/EmploymentDialog.module.css";
import { Tabs } from "../features/admin/components/Tabs";
import { Avatar } from "../features/admin/components/Avatar";
import { Badge } from "../features/admin/components/Badge";
import { StatusBadge } from "../features/admin/components/Badge";
import { Button } from "../components/ui/Button";
import { LinkButton } from "../components/ui/LinkButton";
import { MasterRecordPanel } from "../features/admin/components/employee/MasterRecordPanel";
import { ReportingBlock } from "../features/admin/components/employee/ReportingBlock";
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
import { useDocumentTitle } from "../hooks/useDocumentTitle";
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
  // The rail opens on the section the clicked link points at — the master
  // record's Add links and the setup banner land on the field they name.
  const [employmentSection, setEmploymentSection] = useState<EmploymentSection>("job");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  // Mid-save the employment dialog locks (CAP-5): backdrop click and Esc
  // cannot dismiss it while the details post.
  const [dialogLocked, setDialogLocked] = useState(false);
  // Read before the not-found/failed early returns below — hooks must run
  // on every render, and the panel's pending state is only consulted past
  // them.
  const location = useLocation();
  const navigation = useNavigation();
  const tabLabel =
    data.state === "failed" || data.state === "not-found"
      ? "Employee"
      : (EMPLOYEE_PROFILE_TABS.find((tab) => tab.value === data.tab)?.label ?? "Profile");
  useDocumentTitle(
    data.state === "failed" || data.state === "not-found"
      ? "Employee · Fenzit"
      : `${data.member.name ?? "Employee"} · ${tabLabel} · Fenzit`,
  );

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
  const activateError =
    activate.data?.kind === "activate" && activate.data.state === "error"
      ? activate.data.message
      : null;
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
  const openEmployment = (section: EmploymentSection = "job") => {
    setEmploymentSection(section);
    setDialogOpenCount((count) => count + 1);
    employment.load(`${EMPLOYMENT_RESOURCE_PATH}?userId=${member.userId}`);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <TopBar name={member.name} tabLabel={tabLabel} />
      <header className={styles.pageHead}>
        <section className={styles.profileCard}>
          <div className={styles.profileMain}>
            <span className={styles.avatarWrap}>
              <Avatar name={member.name} imageUrl={member.avatarUrl} size="large" />
              {member.status === "active" ? (
                <span className={styles.avatarDot} aria-hidden="true" />
              ) : null}
            </span>
            <div className={styles.identityText}>
              <div className={styles.identityLine}>
                <h1 className={styles.heading}>{member.name ?? "No Name."}</h1>
                <span className={styles.codeChip}>{member.employeeCode}</span>
                <StatusBadge status={member.status} dot className={styles.statusChip} />
              </div>
              <p className={styles.meta}>
                <span className={styles.metaItem}>
                  <Calendar className={styles.metaIcon} aria-hidden="true" />
                  Added {fmtIstDay(member.createdAt)}
                </span>
                <span className={styles.metaSep} aria-hidden="true">
                  •
                </span>
                <span className={`${styles.metaItem} ${styles.phone}`}>
                  <Phone className={styles.metaIcon} aria-hidden="true" />
                  {fmtPhone(member.countryCode, member.phoneNumber)}
                </span>
              </p>
            </div>
          </div>
          <div className={styles.subRow}>
            <ReportingBlock
              member={member}
              directory={data.directory}
              selfUserId={selfUserId}
              retryRoster={() => {
                if (revalidator.state === "idle") void revalidator.revalidate();
              }}
            />
            <div className={styles.badges}>
              {member.canCreateJobs ? (
                <Badge label="Can Create Jobs" tone="primary" className={styles.profileBadge} />
              ) : null}
              {member.jobApprovalRequired ? (
                <Badge
                  label="Needs Approval for Jobs"
                  tone="scheduled"
                  className={styles.profileBadge}
                  icon={<TriangleAlert size={14} />}
                />
              ) : null}
              {member.role === "company_admin" ? (
                <Badge label="Owner" tone="primary" className={styles.profileBadge} />
              ) : null}
              {member.role === "viewer" ? (
                <Badge label="Viewer" tone="neutral" className={styles.profileBadge} />
              ) : null}
            </div>
          </div>
          <div className={styles.actions}>
            <LinkButton
              to={`/admin/company/jobs/new?technician=${member.userId}`}
              variant="primary"
              className={styles.headerAction}
            >
              <Plus className={styles.actionIcon} aria-hidden="true" />
              Assign Job
            </LinkButton>
            <Button
              variant="secondary"
              className={styles.headerAction}
              onClick={() => openEmployment()}
            >
              <Pencil className={styles.actionIcon} aria-hidden="true" />
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
                  className={styles.headerAction}
                  disabled={activateBusy}
                  onClick={() => setConfirmDeactivate(true)}
                >
                  <XCircle className={styles.actionIcon} aria-hidden="true" />
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
        </section>
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
        <h2 className={styles.srOnly}>{tabLabel}</h2>
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
        className={`${dialogStyles.dialog} ${dialogStyles.dialogRail} ${employmentDialogStyles.wideDialog}`}
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
            name={member.name}
            initialSection={employmentSection}
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

function TopBar({ name, tabLabel }: { name: string | null; tabLabel: string }) {
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
        <span className={styles.crumbPerson}>{name ?? "Employee"}</span>
        <span className={styles.crumbSep} aria-hidden="true">
          ›
        </span>
        <span className={styles.crumbHere} aria-current="page">
          {tabLabel}
        </span>
      </nav>
    </div>
  );
}
