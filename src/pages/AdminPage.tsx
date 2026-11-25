import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useRevalidator,
  useRouteLoaderData,
} from "react-router";
import { Flag, Palmtree } from "lucide-react";
import { CLIENT_ONLY_TITLES } from "../app/pageMeta";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { sectionGroupsFor, sectionsFor } from "../features/admin/adminLoader";
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

/** Shown while the access check runs on a direct visit to /admin. */
export function AdminChecking() {
  return (
    <div className={styles.page}>
      <Container>
        <main className={styles.main}>
          <p className={styles.status}>Checking your access…</p>
        </main>
      </Container>
    </div>
  );
}

/** Reports uses the lucide flag icon, the same family as the mobile app. */
function GlyphReports({ size = 20 }: { size?: number }) {
  return <Flag size={size} strokeWidth={1.75} aria-hidden="true" />;
}

/** Leave uses the lucide palm — time off, the same icon family. */
function GlyphLeave({ size = 20 }: { size?: number }) {
  return <Palmtree size={size} strokeWidth={1.75} aria-hidden="true" />;
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
  "/admin/company/leave": GlyphLeave,
  "/admin/company/attendance": GlyphAttendance,
  "/admin/me": GlyphMe,
};

const ROLE_CAPTION: Record<ConsoleRole, string> = {
  staff: "Fenzit Staff",
  owner: "Company Owner",
  member: "Team Member",
};

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

function UserChip({ name, role }: { name: string | null; role?: ConsoleRole }) {
  // A missing name shows the role as the chip's first line — never a
  // "(no name)" placeholder.
  // A blank or whitespace-only name counts as missing.
  const label = name !== null && name.trim() !== "" ? name : null;
  const primary = label ?? (role !== undefined ? ROLE_CAPTION[role] : "Signed In");
  return (
    <span className={styles.chip}>
      <span className={styles.chipGlyph} aria-hidden="true">
        <GlyphMe size={15} />
      </span>
      <span className={styles.chipText}>
        <span className={styles.chipName}>{primary}</span>
        {label !== null && role !== undefined ? (
          <span className={styles.chipRole}>{ROLE_CAPTION[role]}</span>
        ) : null}
      </span>
    </span>
  );
}

function NavLinks({
  role,
  landing,
  pendingLeaves,
}: {
  role: ConsoleRole;
  landing: boolean;
  pendingLeaves: number | null;
}) {
  return (
    <nav className={styles.nav} aria-label="Console Menu">
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
            return (
              <NavLink
                key={section.to}
                to={section.to}
                end={exact}
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
                {section.label}
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
  // The inspect page uses the whole width: its import table is wide.
  const wide = location.pathname.startsWith("/admin/inspect");
  // A trailing slash is the same page, so it gets the same header rule.
  // A trailing slash is the same page, so it gets the same header rule. The
  // employee profile's param'd address draws its own header too.
  const ownHeader = pageHasOwnHeader(location.pathname);
  const navigation = useNavigation();
  const busy = navigation.state !== "idle" || revalidator.state !== "idle";

  const logOut = () => {
    clearSession();
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
    <div className={styles.page}>
      <title>{CLIENT_ONLY_TITLES["/admin"]}</title>
      <aside className={styles.sidebar}>
        <BrandMark />
        <NavLinks
          role={data.role}
          landing={location.pathname.replace(/\/+$/, "") === "/admin"}
          pendingLeaves={data.pendingLeaves}
        />
        <div className={styles.sidebarFoot}>
          <UserChip name={data.name} role={data.role} />
          <Button variant="secondary" onClick={logOut}>
            Log Out
          </Button>
        </div>
      </aside>
      <div className={wide ? styles.contentWide : styles.content}>
        {/* The loading line: always on the plain pages, and on the pages with
            their own header only while a load runs — there it reads as a
            loader, never as a static divider. */}
        {!ownHeader || busy ? (
          <div className={styles.progress} role="progressbar" aria-hidden={!busy}>
            <span className={busy ? styles.progressFillActive : styles.progressFill} />
          </div>
        ) : null}
        <main className={styles.main}>
          {ownHeader ? null : (
            <h1 className={styles.heading}>
              {data.name === null ? "Hello" : `Hello, ${data.name}`}
            </h1>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
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
  "/admin/company/leave": "Manage leave types and employee leave requests.",
  "/admin/company/attendance": "See who checked in, where they checked in and at what time.",
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
