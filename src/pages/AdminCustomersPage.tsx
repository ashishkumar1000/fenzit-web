import { Link, useLoaderData, useLocation, useNavigation } from "react-router";
import type { adminCustomersLoader } from "../features/admin/adminBrowseLoaders";
import { ConsoleTiles, type ConsoleTile } from "../features/admin/components/ConsoleTiles";
import { CustomersTable } from "../features/admin/components/CustomersTable";
import { TableSkeleton } from "../features/admin/components/Table";
import { AddCustomerControl } from "../features/admin/components/AddCustomerDialog";
import { ExportCustomersButton } from "../features/admin/components/CustomersExport";
import {
  BucketChips,
  ClearAllButton,
  SearchBox,
  FilterDropdown,
} from "../features/admin/components/CustomersFilterBar";
import { Pager, RowsPerPage } from "../features/admin/components/CustomersPager";
import { CUSTOMER_SORT_WORDS } from "../features/admin/customersLabels";
import {
  CrownIcon,
  UserCheckIcon,
  UserIcon,
  UsersIcon,
  ZapIcon,
} from "../components/ui/consoleIcons";
import styles from "./AdminCustomersPage.module.css";

/**
 * The customers page in the console's new design: a top bar (breadcrumb), the
 * greeting block with its actions, the four console tiles, then the customers
 * card — bucket chips, search and sort dropdown, the paged table, and the
 * pager with rows-per-page and go-to. Every filter state is the URL's; the
 * loader asks /customers/page for exactly that view.
 */

export function AdminCustomersPage() {
  const data = useLoaderData<typeof adminCustomersLoader>();
  const navigation = useNavigation();
  const location = useLocation();

  if (data.state === "failed") {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          We could not load the customer list. Please go back to the menu and open this page again.
        </p>
      </div>
    );
  }

  const { result, filters, countries, selfName } = data;
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

  const tiles: ConsoleTile[] = [
    {
      label: "Total Customers",
      value: result.stats.total,
      icon: UsersIcon,
      tone: "primary",
      sub: "All customers in your company.",
    },
    {
      label: "New Customers",
      value: result.stats.new,
      icon: ZapIcon,
      tone: "scheduled",
      pill: { label: "No jobs yet", tone: "scheduled" },
      sub: "Waiting for their first job",
    },
    {
      label: "One Job",
      value: result.stats.single,
      icon: UserIcon,
      tone: "done",
      sub: "Customers who have booked only one job.",
    },
    {
      label: "Repeat Customers",
      value: result.stats.repeat,
      icon: UserCheckIcon,
      tone: "violet",
      pill: { label: "2+ jobs", tone: "violet" },
      sub: "Customers who have booked more than one job. Customers with 10 or more jobs get a VIP tag.",
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
            Manage all your customers, their phone numbers, addresses and booked jobs in one place.
          </p>
        </div>
        <div className={styles.pageActions}>
          <AddCustomerControl countries={countries} />
          <ExportCustomersButton />
        </div>
      </header>
      <ConsoleTiles tiles={tiles} />
      <div className={styles.card}>
        <div className={styles.filterBar}>
          <BucketChips filters={filters} counts={result.stats} />
          <div className={styles.filterControls}>
            <ClearAllButton filters={filters} />
            <SearchBox filters={filters} />
            <FilterDropdown
              label="Sort By"
              field="sort"
              value={filters.sort}
              valueLabel={CUSTOMER_SORT_WORDS[filters.sort]}
              defaultValue="created_new"
              showSearch={false}
              options={[
                { value: "created_new", text: "Newest Added" },
                { value: "created_old", text: "Oldest Added" },
                { value: "name_az", text: "Name (A to Z)" },
                { value: "name_za", text: "Name (Z to A)" },
                { value: "recent_activity", text: "Recently Active" },
              ]}
              filters={filters}
            />
          </div>
        </div>
        {result.data.length === 0 ? (
          <>
            <p className={styles.empty}>
              {/* `total` is the filtered count — a no-match search must not
                  read "add your first customer" to a company that has
                  customers; the tiles' whole-company count is the honest key
                  (found in review 2026-11-25). */}
              {result.stats.total === 0
                ? "No customers added yet. Add your first customer, or create a job for someone. Their details will be saved automatically."
                : "No customers found. Try changing your search or filters."}
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
              <CustomersTable rows={result.data} sort={filters.sort} filters={filters} />
            </div>
            <footer className={styles.tableFooter}>
              <p className={styles.showing}>
                Showing {from} to {to} of {result.total}{" "}
                {result.total === 1 ? "customer" : "customers"}
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
 *  the add and export actions live in the greeting block. */
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
          Customers
        </span>
      </nav>
    </div>
  );
}
