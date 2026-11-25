import { Link, useLoaderData, useLocation, useNavigation } from "react-router";
import type { adminEmployeesLoader } from "../features/admin/adminBrowseLoaders";
import { ConsoleTiles, type ConsoleTile } from "../features/admin/components/ConsoleTiles";
import { MembersTable } from "../features/admin/components/MembersTable";
import { TableSkeleton } from "../features/admin/components/Table";
import { AddEmployeeControl } from "../features/admin/components/AddEmployeeDialog";
import { ExportCsvButton } from "../features/admin/components/EmployeesExport";
import {
  ClearAllButton,
  SearchBox,
  StatusChips,
  FilterDropdown,
} from "../features/admin/components/EmployeesFilterBar";
import { Pager, RowsPerPage } from "../features/admin/components/EmployeesPager";
import {
  ApprovalTagIcon,
  BellIcon,
  ClipboardListIcon,
  CrownIcon,
  PowerIcon,
  UserCheckIcon,
  UsersIcon,
  ZapIcon,
} from "../components/ui/consoleIcons";
import { JOB_WORDS, ROLE_WORDS, SORT_WORDS } from "../features/admin/employeesLabels";
import styles from "./AdminEmployeesPage.module.css";

/**
 * The team page in the console's new design: a top bar (breadcrumb, search,
 * invite), the greeting block with its actions, the four console tiles, then
 * the team card — status chips, role / job-setting / sort dropdowns, the paged
 * table, and the pager with rows-per-page and go-to. Every filter state is
 * the URL's; the loader asks /members/page for exactly that view.
 */

export function AdminEmployeesPage() {
  const data = useLoaderData<typeof adminEmployeesLoader>();
  const navigation = useNavigation();
  const location = useLocation();

  if (data.state === "failed") {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          We could not load the employee list. Please go back to the menu and open this page again.
        </p>
      </div>
    );
  }

  const { result, filters, countries, selfUserId, selfName } = data;
  const from = (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.page * result.pageSize, result.total);
  const busy = navigation.state !== "idle";
  // A different address is loading (a filter or page changed) — the table's
  // rows are about to be replaced, so the skeleton stands in. A plain
  // revalidation (an action's refetch) keeps the current rows on screen.
  const navigating =
    navigation.state === "loading" &&
    (navigation.location?.pathname !== location.pathname ||
      navigation.location?.search !== location.search);
  const activePct =
    result.stats.total > 0 ? Math.round((result.stats.active / result.stats.total) * 100) : 0;

  const tiles: ConsoleTile[] = [
    {
      label: "Total Employees",
      value: result.stats.total,
      icon: UsersIcon,
      tone: "primary",
      sub: `${result.stats.active} Active, ${result.stats.invited} Invited and ${result.stats.deactivated} Deactivated.`,
    },
    {
      label: "Active Employees",
      value: result.stats.active,
      icon: UserCheckIcon,
      tone: "done",
      bar: activePct,
      sub: `${activePct}% of all employees.`,
    },
    {
      label: "Pending Invitations",
      value: result.stats.invited,
      icon: BellIcon,
      tone: "scheduled",
      pill: { label: "Invited", tone: "scheduled" },
      sub: "Waiting for the employee to sign in for the first time.",
    },
    {
      label: "Jobs Waiting for Approval",
      value: result.stats.needsApproval,
      icon: ClipboardListIcon,
      tone: "violet",
      pill: { label: "Approval Pending", tone: "violet" },
      sub: "New jobs created by these employees need your approval.",
    },
  ];

  return (
    <>
      <TopBar />
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.heading}>
            {selfName === null ? "Hello" : `Hello, ${selfName}`}
            <span className={styles.rolePill}>
              <CrownIcon size={13} className={styles.rolePillIcon} />
              Owner
            </span>
          </h1>
          <p className={styles.lede}>
            Manage your team, send invitations, update employee details and approve their jobs from
            one place.
          </p>
        </div>
        <div className={styles.pageActions}>
          <AddEmployeeControl countries={countries} />
          <ExportCsvButton />
        </div>
      </header>
      <ConsoleTiles tiles={tiles} />
      <div className={styles.card}>
        <div className={styles.filterBar}>
          <StatusChips filters={filters} counts={result.stats} />
          <div className={styles.filterControls}>
            <ClearAllButton filters={filters} />
            <SearchBox filters={filters} />
            <FilterDropdown
              label="Role"
              field="role"
              value={filters.role}
              valueLabel={ROLE_WORDS[filters.role]}
              defaultValue="all"
              options={[
                { value: "all", text: "All Roles", count: result.stats.byRole.all },
                { value: "company_admin", text: "Owner", count: result.stats.byRole.company_admin },
                { value: "employee", text: "Employee", count: result.stats.byRole.employee },
                { value: "viewer", text: "Viewer", count: result.stats.byRole.viewer },
              ]}
              searchPlaceholder="Filter roles…"
              filters={filters}
            />
            <FilterDropdown
              label="Job settings"
              field="jobSetting"
              value={filters.jobSetting}
              valueLabel={JOB_WORDS[filters.jobSetting]}
              defaultValue="all"
              options={[
                { value: "all", text: "All Settings", count: result.stats.byJobSetting.all },
                {
                  value: "off",
                  chip: { label: "Off", tone: "gray", Icon: PowerIcon },
                  text: "Cannot Create Jobs",
                  count: result.stats.byJobSetting.off,
                },
                {
                  value: "create_only",
                  chip: { label: "Can Create Jobs", tone: "green", Icon: ZapIcon },
                  count: result.stats.byJobSetting.createOnly,
                },
                {
                  value: "approval",
                  chip: {
                    label: "Can Create Jobs with Approval",
                    tone: "violet",
                    Icon: ApprovalTagIcon,
                  },
                  count: result.stats.byJobSetting.approval,
                },
              ]}
              searchPlaceholder="Filter job settings…"
              filters={filters}
            />
            <FilterDropdown
              label="Sort"
              field="sort"
              value={filters.sort}
              valueLabel={SORT_WORDS[filters.sort]}
              defaultValue="joined_new"
              showSearch={false}
              options={[
                { value: "joined_new", text: "Recently Joined" },
                { value: "joined_old", text: "First Joined" },
                { value: "name_az", text: "Name (A to Z)" },
                { value: "name_za", text: "Name (Z to A)" },
                { value: "code_az", text: "Code (A to Z)" },
                { value: "code_za", text: "Code (Z to A)" },
              ]}
              filters={filters}
            />
          </div>
        </div>
        {result.data.length === 0 ? (
          <>
            <p className={styles.empty}>
              {result.total === 0
                ? "No employees added yet."
                : "No employees found. Try changing your filters or search."}
            </p>
            {result.total > 0 ? (
              <footer className={styles.tableFooter}>
                <RowsPerPage filters={filters} />
                <Pager filters={filters} page={result.page} pages={result.pages} />
              </footer>
            ) : null}
          </>
        ) : navigating ? (
          <TableSkeleton rows={6} />
        ) : (
          <>
            <div className={styles.tableWrap}>
              <MembersTable
                rows={result.data}
                sort={filters.sort}
                filters={filters}
                selfUserId={selfUserId}
              />
            </div>
            <footer className={styles.tableFooter}>
              <p className={styles.showing}>
                Showing {from} to {to} of {result.total}{" "}
                {result.total === 1 ? "employee" : "employees"}
                {busy ? " — Updating…" : ""}
              </p>
              <RowsPerPage filters={filters} />
              <Pager filters={filters} page={result.page} pages={result.pages} />
            </footer>
          </>
        )}
      </div>
    </>
  );
}

/** The page's top bar: the breadcrumb. The search lives in the filter strip;
 *  the invite and export actions live in the greeting block. */
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
          Employees
        </span>
      </nav>
    </div>
  );
}
