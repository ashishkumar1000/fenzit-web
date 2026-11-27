import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useFetchers,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useRevalidator,
  useRouteLoaderData,
} from "react-router";
// The phone menu closes when the address changes. That is UI state synced
// to a navigation, not server data — the router loader owns the data, and
// no fetch happens here.
// eslint-disable-next-line no-restricted-imports -- UI-only navigation sync; no data fetched
import { useEffect, useRef, useState } from "react";
import {
  CircleQuestionMark,
  Flag,
  LogOut,
  Menu as MenuIcon,
  Palmtree,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import { CLIENT_ONLY_TITLES } from "../app/pageMeta";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { FullPageLoader } from "../components/ui/FullPageLoader";
import { LoadingOverlay } from "../components/ui/LoadingOverlay";
import { SkeletonBlock, SkeletonSlot } from "../components/ui/Skeleton";
import { ToastHost } from "../components/ui/ToastHost";
import { sectionGroupsFor, sectionsFor } from "../features/admin/adminLoader";
import { invalidateIdentityCache } from "../features/admin/identityCache";
import {
  RegionDetailSkeleton,
  RegionRowsSkeleton,
  RegionTilesSkeleton,
} from "../features/admin/components/RegionSkeleton";
import type { adminLoader, ConsoleRole } from "../features/admin/adminLoader";
import {
  ConsoleArt,
  GlyphAccount,
  GlyphArrow,
  GlyphAttendance,
  GlyphCompany,
  GlyphConfig,
  GlyphCustomers,
  GlyphDeletion,
  GlyphHolidays,
  GlyphInspect,
  GlyphJobs,
  GlyphMe,
  GlyphPayroll,
  GlyphShield,
} from "../features/admin/components/glyphs";
import logo from "../assets/brand/logo.png";
import logo2x from "../assets/brand/logo-2x.png";
import logo3x from "../assets/brand/logo-3x.png";
import { clearSession } from "../services/session";
import styles from "./AdminPage.module.css";

/** Shown while the access check runs on a direct visit to /admin: the
 *  full-page Pour loader centered on a light blurred pane (2026-11-26),
 *  instead of the plain text line it replaced. The loader's own
 *  role="status" announces the label politely, so the screen-reader
 *  contract of the old text is kept. */
export function AdminChecking() {
  return <FullPageLoader label="Checking your access…" />;
}

/** Reports uses the lucide flag icon, the same family as the mobile app. */
function GlyphReports({ size = 20 }: { size?: number }) {
  return <Flag size={size} strokeWidth={1.75} aria-hidden="true" />;
}

/** Leave uses the lucide palm — time off, the same icon family. */
function GlyphLeave({ size = 20 }: { size?: number }) {
  return <Palmtree size={size} strokeWidth={1.75} aria-hidden="true" />;
}

/** Help & Support uses the lucide question circle, the same family. */
function GlyphHelp({ size = 20 }: { size?: number }) {
  return <CircleQuestionMark size={size} strokeWidth={1.75} aria-hidden="true" />;
}

/** The design's Settings row: a gear, shown disabled until the screen ships. */
function GlyphSettings({ size = 20 }: { size?: number }) {
  return <Settings size={size} strokeWidth={1.75} aria-hidden="true" />;
}

const GLYPHS: Record<string, (props: { size?: number }) => React.JSX.Element> = {
  "/admin/inspect": GlyphInspect,
  "/admin/account": GlyphAccount,
  "/admin/reports": GlyphReports,
  "/admin/deletion-requests": GlyphDeletion,
  "/admin/config": GlyphConfig,
  "/admin/company": GlyphCompany,
  "/admin/company/customers": GlyphCustomers,
  "/admin/company/employees": GlyphMe,
  "/admin/company/payroll": GlyphPayroll,
  "/admin/company/jobs": GlyphJobs,
  "/admin/company/holidays": GlyphHolidays,
  "/admin/company/holidays/schedule": GlyphHolidays,
  "/admin/company/leave": GlyphLeave,
  "/admin/company/attendance": GlyphAttendance,
  "/admin/me": GlyphMe,
  "/admin/help": GlyphHelp,
  "/admin/settings": GlyphSettings,
};

const ROLE_CAPTION: Record<ConsoleRole, string> = {
  staff: "Fenzit Staff",
  owner: "Company Owner",
  member: "Team Member",
};

/** The rail's expanded/collapsed choice, remembered between visits. */
const SIDEBAR_STATE_KEY = "fenzit.console.sidebar";

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STATE_KEY) === "collapsed";
  } catch {
    return false;
  }
}

function BrandMark() {
  return (
    <Link to="/" className={styles.brand} aria-label="Fenzit home">
      {/* Same brand glyph as the mobile app; the wordmark beside it names it. */}
      <img
        className={styles.mark}
        src={logo}
        srcSet={`${logo} 1x, ${logo2x} 2x, ${logo3x} 3x`}
        width={32}
        height={32}
        alt=""
      />
      <span className={styles.brandName}>Fenzit</span>
      {/* The design's plan pill — static brand copy until a plan concept
          exists to hang it on. */}
      <span className={styles.brandBadge}>PRO</span>
    </Link>
  );
}

/** The initials on the collapsed rail's avatar: the last two words of the
 *  name ("PQA Owner Ashok Rao" → "AR"), because the first words can be the
 *  company. One word gives its first letter. */
function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/);
  const picked = words.length > 1 ? words.slice(-2) : words;
  return picked.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function UserChip({ name, role }: { name: string | null; role?: ConsoleRole }) {
  // A missing name shows the role as the chip's first line — never a
  // "(no name)" placeholder.
  // A blank or whitespace-only name counts as missing.
  const label = name !== null && name.trim() !== "" ? name : null;
  const primary = label ?? (role !== undefined ? ROLE_CAPTION[role] : "Signed In");
  const initials = label === null ? null : initialsFor(label);
  return (
    <span
      className={styles.chip}
      title={role !== undefined ? `${primary} (${ROLE_CAPTION[role]})` : primary}
    >
      <span className={styles.chipGlyph} aria-hidden="true">
        <GlyphMe size={15} />
      </span>
      {initials !== null ? (
        <span className={styles.chipInitials} aria-hidden="true">
          {initials}
        </span>
      ) : null}
      <span className={styles.chipText}>
        <span className={styles.chipName}>{primary}</span>
        {label !== null && role !== undefined ? (
          <span className={styles.chipRole}>{ROLE_CAPTION[role]}</span>
        ) : null}
      </span>
      <span className={styles.chipStatus} aria-hidden="true" />
    </span>
  );
}

function NavLinks({
  role,
  landing,
  pendingLeaves,
  collapsed,
}: {
  role: ConsoleRole;
  landing: boolean;
  pendingLeaves: number | null;
  collapsed: boolean;
}) {
  return (
    <nav id="console-nav" className={styles.nav} aria-label="Console Menu">
      {sectionGroupsFor(role).map((group, groupIndex) => (
        <div key={group.caption ?? `group-${groupIndex}`} className={styles.navGroup}>
          {group.caption !== null ? <p className={styles.navCaption}>{group.caption}</p> : null}
          {group.links.map((section, index) => {
            const Glyph = GLYPHS[section.to] ?? GlyphMe;
            // On the landing the first section reads as where you are — the index
            // below opens with it, so the sidebar says so too. Visual only: no
            // aria-current, because the URL is still /admin.
            const leadsLanding = landing && groupIndex === 0 && index === 0;
            // The Leave badge: the tenant's pending requests, the design's
            // count chip on the row. It names the count for AT too.
            const pendingBadge =
              section.to === "/admin/company/leave" && pendingLeaves !== null && pendingLeaves > 0
                ? pendingLeaves
                : null;
            // Landing sections own their address exactly: Overview must not stay
            // lit on /admin/company/jobs or any other sub-list.
            const exact = section.to === "/admin/company";
            if (section.disabled) {
              return (
                <span
                  key={section.to}
                  className={`${styles.navLink} ${styles.navLinkDisabled}`}
                  role="link"
                  aria-disabled="true"
                  aria-label={section.label}
                  aria-describedby="console-settings-note"
                  tabIndex={0}
                  title={`${section.label} is coming soon.`}
                >
                  <span className={styles.navGlyph} aria-hidden="true">
                    <Glyph size={18} />
                  </span>
                  <span className={styles.navLabel}>{section.label}</span>
                  {/* Phones have no hover: the reason rides in the row. On
                      wide screens it is still the row's description, just
                      visually quiet. */}
                  <span id="console-settings-note" className={styles.navNote}>
                    Coming soon
                  </span>
                </span>
              );
            }
            return (
              <NavLink
                key={section.to}
                to={section.to}
                end={exact}
                title={collapsed ? section.label : undefined}
                aria-label={
                  pendingBadge !== null
                    ? `Leave – ${pendingBadge} ${pendingBadge === 1 ? "request" : "requests"} waiting`
                    : undefined
                }
                className={({ isActive }) =>
                  isActive || leadsLanding
                    ? `${styles.navLink} ${styles.navLinkActive}`
                    : styles.navLink
                }
              >
                <span className={styles.navGlyph} aria-hidden="true">
                  <Glyph size={18} />
                </span>
                <span className={styles.navLabel}>{section.label}</span>
                {pendingBadge !== null ? (
                  <span className={styles.navBadge} aria-hidden="true">
                    {pendingBadge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** The console layout: the brand, this role's sections in a sidebar on wide
 *  screens (top tabs on phones), then the section itself. */
export function AdminLayout() {
  const data = useLoaderData<typeof adminLoader>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const location = useLocation();
  // The rail's two design states: the full 280px navigation and the 72px
  // icon-only rail. Phones keep their top bar either way.
  const [railCollapsed, setRailCollapsed] = useState(readSidebarCollapsed);
  // Phones: the ten-section nav would wrap into five rows above every page,
  // so it waits behind one Menu control. Desktop ignores this state — the
  // rail is always visible there.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement | null>(null);
  // A navigation is the menu's job done: the panel closes behind the tap.
  // Closing in the link's own click handler would detach the anchor before
  // the browser follows it; the address change is the honest signal. The
  // location key rather than the path, because a tab or month change is a
  // navigation too and the panel must not sit over the page it opened.
  const menuLocationKey = useRef(location.key);
  useEffect(() => {
    if (menuLocationKey.current === location.key) return;
    menuLocationKey.current = location.key;
    setMenuOpen(false);
  }, [location.key]);
  const toggleRail = () => {
    setRailCollapsed((wasCollapsed) => {
      const next = !wasCollapsed;
      try {
        window.localStorage.setItem(SIDEBAR_STATE_KEY, next ? "collapsed" : "expanded");
      } catch {
        // A private-mode quota failure only costs the memory of the choice.
      }
      return next;
    });
  };
  // The inspect page uses the whole width: its import table is wide.
  const wide = location.pathname.startsWith("/admin/inspect");
  // A trailing slash is the same page, so it gets the same header rule.
  // A trailing slash is the same page, so it gets the same header rule. The
  // employee profile's param'd address draws its own header too.
  const ownHeader = pageHasOwnHeader(location.pathname);
  const navigation = useNavigation();
  // Fetchers count too: a mutation posted from the bottom of a long page is
  // exactly the activity the console must make visible.
  const fetchers = useFetchers();
  const busy =
    navigation.state !== "idle" ||
    revalidator.state !== "idle" ||
    fetchers.some((fetcher) => fetcher.state !== "idle");
  // A different console page is loading (a route navigation — includes the
  // target page's first lazy chunk and both loader levels): the content
  // region stands in with the target page's archetype while the load
  // persists past the delay. Same-page revalidations and query-only
  // navigations (tab/month/filter changes) keep the current page — the
  // pages scope those to their own regions, and the loading cases' cue for
  // visible data is stale-while-revalidate, not a full swap.
  const pendingPathname =
    navigation.state === "loading" ? navigation.location?.pathname : undefined;
  const pageNavigating =
    pendingPathname !== undefined &&
    pendingPathname.startsWith("/admin") &&
    pendingPathname.replace(/\/+$/, "") !== location.pathname.replace(/\/+$/, "");
  const targetPathname = pendingPathname ?? location.pathname;

  const logOut = () => {
    clearSession();
    // The identity cache is keyed by token (CAP-8) — nothing the old session
    // fetched may serve the next sign-in.
    invalidateIdentityCache();
    navigate("/login", { replace: true });
  };

  if (data.status === "failed") {
    return (
      <div className={styles.page}>
        <Container>
          <main className={styles.main}>
            <h1 className={styles.heading}>Console</h1>
            <p className={styles.error} role="alert">
              We could not check your access. Please check your internet connection and try again.
            </p>
            <Button onClick={() => revalidator.revalidate()} disabled={busy}>
              {busy ? "Checking…" : "Try Again"}
            </Button>
          </main>
        </Container>
      </div>
    );
  }

  return (
    <div
      className={railCollapsed ? `${styles.page} ${styles.pageRail}` : styles.page}
      onKeyDown={(event) => {
        // Any focus inside the shell closes the phone menu — the panel is a
        // disclosure, not a modal, so Escape must work from the page too.
        if (event.key !== "Escape" || !menuOpen) return;
        setMenuOpen(false);
        menuToggleRef.current?.focus();
      }}
    >
      <title>{CLIENT_ONLY_TITLES["/admin"]}</title>
      <a href="#console-content" className={styles.skipLink}>
        Skip to content
      </a>
      <aside
        id="console-sidebar"
        className={styles.sidebar}
        data-collapsed={railCollapsed ? "true" : "false"}
        data-menu={menuOpen ? "open" : "closed"}
      >
        <div className={styles.sidebarHead}>
          <BrandMark />
          <div className={styles.sidebarActions}>
            <button
              type="button"
              className={styles.railToggle}
              onClick={toggleRail}
              aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!railCollapsed}
              aria-controls="console-sidebar"
              title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {railCollapsed ? (
                <PanelLeftOpen size={16} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={16} aria-hidden="true" />
              )}
            </button>
            <button
              ref={menuToggleRef}
              type="button"
              className={styles.menuToggle}
              onClick={() => setMenuOpen((wasOpen) => !wasOpen)}
              aria-expanded={menuOpen}
              aria-controls="console-nav"
            >
              {menuOpen ? (
                <X size={18} aria-hidden="true" />
              ) : (
                <MenuIcon size={18} aria-hidden="true" />
              )}
              <span>Menu</span>
            </button>
          </div>
        </div>
        <NavLinks
          role={data.role}
          landing={location.pathname.replace(/\/+$/, "") === "/admin"}
          pendingLeaves={data.pendingLeaves}
          collapsed={railCollapsed}
        />
        <div className={styles.sidebarFoot}>
          <UserChip name={data.name} role={data.role} />
          <Button variant="secondary" className={styles.logOut} onClick={logOut}>
            <LogOut className={styles.logOutIcon} size={16} aria-hidden="true" />
            <span className={styles.logOutText}>Log Out</span>
          </Button>
        </div>
      </aside>
      <div className={wide ? styles.contentWide : styles.content}>
        <main id="console-content" tabIndex={-1} className={styles.main}>
          {ownHeader ? null : (
            <h1 className={styles.heading}>
              {data.name === null ? "Hello" : `Hello, ${data.name}`}
            </h1>
          )}
          <SkeletonSlot show={pageNavigating} skeleton={<NavSkeleton pathname={targetPathname} />}>
            <Outlet />
          </SkeletonSlot>
        </main>
      </div>
      {/* The console's activity overlay: the Pour loader floating over the
          console while any router work runs — navigations, revalidations and
          fetchers. It replaces the old 3px line loader (owner, 2026-11-26):
          loud enough to see from the bottom of a long page, transparent and
          click-through so the shell beneath stays usable. Its own timing
          (300ms in, 500ms minimum) keeps quick operations flash-free. */}
      <LoadingOverlay show={busy} />
      {/* The console's toast layer (CAP-5): one host for the whole shell, so
          a mutation's outcome outlives the card that started it and any
          scroll away from its status line. */}
      <ToastHost />
    </div>
  );
}

/** The content region's target-archetype skeleton (CAP-2): while a route
 *  navigation loads a different console page, the shell renders this in the
 *  slot, shaped like the page the user is heading to. Purely decorative —
 *  the LoadingOverlay carries the announcement. */
function NavSkeleton({ pathname }: { pathname: string }) {
  const archetype = targetArchetype(pathname);
  if (archetype === "dashboard") {
    return (
      <div className={styles.navStack}>
        <SkeletonBlock width="34%" height={20} />
        <RegionTilesSkeleton />
        <RegionRowsSkeleton rows={3} columns={[1.2, 2.5, 1.2]} />
      </div>
    );
  }
  if (archetype === "detail") {
    return <RegionDetailSkeleton />;
  }
  if (archetype === "calendar") {
    return (
      <div className={styles.navStack}>
        <SkeletonBlock width="30%" height={20} />
        <div className={styles.navColumns}>
          <RegionRowsSkeleton rows={5} columns={[1]} />
          <RegionRowsSkeleton rows={4} columns={[1]} />
        </div>
      </div>
    );
  }
  return (
    <div className={styles.navStack}>
      <SkeletonBlock width="30%" height={20} />
      <RegionRowsSkeleton rows={8} columns={[2.4, 1.6, 1.2, 1.2, 1.4]} />
    </div>
  );
}

/** The target page's archetype, from the loading cases' surface map: the
 *  company overview reads as a dashboard of tiles and panels; a single
 *  job's or employee's page and the form/profile pages read as detail
 *  bodies; the holidays calendar is a two-column card grid; everything
 *  else is a table or list. */
function targetArchetype(pathname: string): "table" | "dashboard" | "detail" | "calendar" {
  const clean = pathname.replace(/\/+$/, "");
  if (clean === "/admin/company") {
    return "dashboard";
  }
  if (
    /^\/admin\/company\/jobs\/[^/]+$/.test(clean) ||
    /^\/admin\/company\/employees\/[^/]+$/.test(clean)
  ) {
    return "detail";
  }
  // The bulk-upload tab is a form card, not a list — the detail body reads
  // right where a table skeleton would mislead.
  if (clean === "/admin/company/holidays/upload") {
    return "detail";
  }
  // The calendar tab's body is the month card and the side lists in two
  // columns — the schedule tab beside it stays a table, as it is one.
  if (clean === "/admin/company/holidays") {
    return "calendar";
  }
  if (clean === "/admin/config" || clean === "/admin/me" || clean.startsWith("/admin/me/")) {
    return "detail";
  }
  return "table";
}

/** The pages that draw their own heading block (breadcrumb, greeting, page
 *  actions) — the console h1 steps aside for them. The employee profile's
 *  address carries the member id, so it matches by prefix. */
function pageHasOwnHeader(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "");
  return PAGES_WITH_OWN_HEADER.has(clean) || clean.startsWith("/admin/company/employees/");
}

const PAGES_WITH_OWN_HEADER = new Set([
  "/admin/company",
  "/admin/company/employees",
  "/admin/company/customers",
  "/admin/company/jobs",
  "/admin/company/leave",
  "/admin/company/attendance",
  "/admin/company/payroll",
  // All three holidays pages draw the design's full header: crumbs, greeting, offices.
  "/admin/company/holidays",
  "/admin/company/holidays/schedule",
  "/admin/company/holidays/upload",
  "/admin/help",
]);

/** One plain-English line per section, shown under its name on the landing
 *  index. Keyed by the section's route, the same key the glyphs use. */
const SECTION_BLURBS: Record<string, string> = {
  "/admin/inspect": "View all details about a person in one place.",
  "/admin/account": "Manage staff access and sign-in settings.",
  "/admin/reports": "Review job photos reported by users. You can hide or dismiss them.",
  "/admin/deletion-requests":
    "View requests from people who want their data deleted and check what action was taken.",
  "/admin/config": "Manage app updates and support contact details.",
  "/admin/company": "See today's business summary, job reports and company details.",
  "/admin/company/customers": "View your customers and the jobs booked for them.",
  "/admin/company/employees": "Manage your team, their details and office assignments.",
  "/admin/company/payroll": "Manage salary details, deductions and government rules.",
  "/admin/company/jobs": "Create jobs, assign them to employees and track their progress.",
  "/admin/company/holidays": "Manage holidays for your team.",
  "/admin/company/holidays/schedule": "See every holiday of the year in one table.",
  "/admin/company/leave": "Manage leave types and employee leave requests.",
  "/admin/company/attendance": "See who checked in, where they checked in and at what time.",
  "/admin/help": "Answers to common questions and a direct line to the Fenzit team.",
};

/** Members never reach the index: AdminHome sends them to Me first. */
type IndexRole = Exclude<ConsoleRole, "member">;

const LEDE: Record<IndexRole, string> = {
  staff: "Manage the entire system from one place.",
  owner: "Manage your entire business from one place.",
};

/** The landing index: one row per section this role can open, the whole row
 *  the link. The sidebar repeats the same sections for in-app navigation. */
function SectionIndex({ role }: { role: IndexRole }) {
  return (
    <>
      <p className={styles.lede}>{LEDE[role]}</p>
      <ul className={styles.index}>
        {sectionsFor(role).map((section) => {
          const Glyph = GLYPHS[section.to] ?? GlyphMe;
          return (
            <li key={section.to}>
              <Link to={section.to} className={styles.indexRow}>
                <span className={styles.indexGlyph} aria-hidden="true">
                  <Glyph size={22} />
                </span>
                <span className={styles.indexText}>
                  <span className={styles.indexName}>{section.label}</span>
                  {SECTION_BLURBS[section.to] ? (
                    <span className={styles.indexDesc}>{SECTION_BLURBS[section.to]}</span>
                  ) : null}
                </span>
                <span className={styles.indexGo} aria-hidden="true">
                  <GlyphArrow size={18} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** The landing: an owner is sent straight to the merged Overview (the
 *  dashboard and the overview were two pages saying the same things — they
 *  are one page now); everyone else sees this role's sections as an index,
 *  with the console art beside it. A member's console IS the Me section — no
 *  welcome screen to click past. */
export function AdminHome() {
  const data = useRouteLoaderData<typeof adminLoader>("admin");
  const location = useLocation();

  if (data === undefined) {
    return (
      <p className={styles.lede} role="status">
        Loading your dashboard…
      </p>
    );
  }
  if (data.status === "failed") {
    return (
      <p className={styles.error} role="alert">
        We could not load your dashboard. Please check your internet connection and try again.
      </p>
    );
  }

  if (data.role === "member") {
    return <Navigate to="/admin/me" replace />;
  }

  if (data.role === "owner") {
    // The dashboard's old deep links carried their report window in this
    // address's query — ride it over instead of landing on the default
    // period (the approvals redirect's rule: keep filters and cursors).
    return <Navigate to={`/admin/company${location.search}`} replace />;
  }

  return (
    <div className={styles.home}>
      <div className={styles.homeArt}>
        <ConsoleArt />
      </div>
      <SectionIndex role={data.role} />
      {data.role === "staff" ? (
        <p className={styles.footnote}>
          <GlyphShield size={14} />
          You cannot delete anything from this page.
        </p>
      ) : null}
    </div>
  );
}
