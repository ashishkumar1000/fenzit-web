import { Link, useLoaderData, useLocation, useNavigation, useRevalidator } from "react-router";
import type { adminLeaveLoader } from "../features/admin/leaveLoaders";
import { LEAVE_PATH } from "../features/admin/leaveUrl";
import { LeaveTypesTab } from "../features/admin/components/LeaveTypesTab";
import { LeaveRequestsTab } from "../features/admin/components/LeaveRequestsTab";
import { LeaveCalendarTab } from "../features/admin/components/LeaveCalendarTab";
import { RegionTableSkeleton } from "../features/admin/components/RegionSkeleton";
import { SectionCard } from "../features/admin/components/SectionCard";
import { Tabs } from "../features/admin/components/Tabs";
import { SkeletonSlot } from "../components/ui/Skeleton";
import { CrownIcon } from "../components/ui/consoleIcons";
import styles from "./AdminLeavePage.module.css";

const LEAVE_TABS = [
  // "Config" — the mobile redesign renamed the tab (the fixed catalog's
  // values are configuration, not a list of types); parity with the app.
  { value: "types", label: "Config" },
  { value: "requests", label: "Requests" },
  { value: "calendar", label: "Upcoming Leaves" },
];

/** The Leave section, one tab per panel: the fixed leave-type catalog's
 *  values — rate, carry-forward, paid, enabled — the whole company's
 *  requests with the owner's decisions, and the month calendar of approved
 *  time off. Only the active tab's data is fetched — a tab change is
 *  navigation (`?tab=`), a filter or pager change is an address. */
export function AdminLeavePage() {
  const data = useLoaderData<typeof adminLeaveLoader>();
  const revalidator = useRevalidator();
  const busy = revalidator.state !== "idle";
  const location = useLocation();
  const navigation = useNavigation();
  // The panel region's load: a same-page address change (tab, month, status,
  // filters) is a genuine refetch — while it persists past the delay, the
  // panel below the tab strip stands in. A different page's navigation is
  // the shell's skeleton; a same-address revalidation keeps the panel.
  const regionPending =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname &&
    navigation.location?.search !== location.search;
  // The tab strip reads the tab being loaded, so the strip follows the click
  // while the panel holds.
  const pendingTab = regionPending
    ? new URLSearchParams(navigation.location?.search).get("tab")
    : null;

  if (data.state === "failed") {
    return (
      <>
        <TopBar />
        <div className={styles.stack}>
          <Tabs basePath={LEAVE_PATH} tabs={LEAVE_TABS} current={data.tab} />
          <SectionCard title="Leave">
            <p className={styles.failed} role="alert">
              This page could not load.
              <button
                type="button"
                className={styles.retry}
                onClick={() => revalidator.revalidate()}
                disabled={busy}
              >
                {busy ? "Retrying…" : "Try again"}
              </button>
            </p>
          </SectionCard>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.heading}>
            {data.selfName === null ? "Hello" : `Hello, ${data.selfName}`}
            <span className={styles.rolePill}>
              <CrownIcon size={13} className={styles.rolePillIcon} />
              Owner
            </span>
          </h1>
          <p className={styles.lede}>
            The leave your team can take, and the requests waiting on you — set each type's rules
            once, decide requests as they come.
          </p>
        </div>
      </header>
      <Tabs
        basePath={LEAVE_PATH}
        tabs={LEAVE_TABS}
        current={
          pendingTab !== null && LEAVE_TABS.some((tab) => tab.value === pendingTab)
            ? pendingTab
            : data.tab
        }
      />
      <SkeletonSlot show={regionPending} skeleton={<RegionTableSkeleton rows={7} />}>
        {data.tab === "types" ? <LeaveTypesTab rows={data.rows} /> : null}
        {data.tab === "calendar" ? (
          // Keyed by the month so a month change remounts the tab — the day
          // modal is component state, and a stale one must not survive the
          // navigation that replaced the grid beneath it.
          <LeaveCalendarTab
            key={data.month}
            month={data.month}
            page={data.page}
            upcoming={data.upcoming}
            upcomingHasMore={data.upcomingHasMore}
            holidays={data.holidays}
            summary={data.summary}
          />
        ) : null}
        {data.tab === "requests" ? (
          <LeaveRequestsTab
            status={data.status}
            q={data.q}
            month={data.month}
            cursor={data.cursor}
            selected={data.selected}
            counts={data.counts}
            page={data.page}
            selection={data.selection}
            hasMore={data.page.hasMore}
            nextCursor={data.page.nextCursor}
          />
        ) : null}
      </SkeletonSlot>
    </>
  );
}

/** The breadcrumb bar: Console › Leave. */
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
          Leave
        </span>
      </nav>
    </div>
  );
}
