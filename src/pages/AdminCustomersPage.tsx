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
          The customer list could not load. Try opening this page again from the menu.
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
      label: "Total customers",
      value: result.stats.total,
      icon: UsersIcon,
      tone: "primary",
      sub: "Everyone in your company's book",
    },
    {
      label: "New leads",
      value: result.stats.new,
      icon: ZapIcon,
      tone: "scheduled",
      pill: { label: "No jobs yet", tone: "scheduled" },
      sub: "Waiting for their first job",
    },
    {
      label: "Single job",
      value: result.stats.single,
      icon: UserIcon,
      tone: "done",
      sub: "Exactly one job so far",
    },
    {
      label: "Repeat customers",
      value: result.stats.repeat,
      icon: UserCheckIcon,
      tone: "violet",
      pill: { label: "2+ jobs", tone: "violet" },
      sub: "They come back — 10+ jobs wear a VIP badge",
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
            Your customer book — contacts, addresses and the jobs booked for them, all in one
            place.
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
              label="Sort"
              field="sort"
              value={filters.sort}
              valueLabel={CUSTOMER_SORT_WORDS[filters.sort]}
              defaultValue="created_new"
              showSearch={false}
              options={[
                { value: "created_new", text: "Added (newest)" },
                { value: "created_old", text: "Added (oldest)" },
                { value: "name_az", text: "Name (A–Z)" },
                { value: "name_za", text: "Name (Z–A)" },
                { value: "recent_activity", text: "Recent activity" },
              ]}
              filters={filters}
            />
          </div>
        </div>
        {result.data.length === 0 ? (
          <>
            <p className={styles.empty}>
              {result.total === 0
                ? "No customers yet. Add the first one, or book a job and we'll save them."
                : "No customers match these filters, or this page is past the last one."}
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
                Showing {from}–{to} of {result.total}{" "}
                {result.total === 1 ? "customer" : "customers"}
                {busy ? " — updating…" : ""}
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
