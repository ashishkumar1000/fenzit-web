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
import { Flag } from "lucide-react";
import { AdminOwnerDashboard } from "./AdminOwnerDashboard";
import { CLIENT_ONLY_TITLES } from "../app/pageMeta";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { sectionsFor } from "../features/admin/adminLoader";
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

const GLYPHS: Record<string, (props: { size?: number }) => React.JSX.Element> = {
  "/admin": GlyphAttendance,
  "/admin/inspect": GlyphInspect,
  "/admin/account": GlyphAccount,
  "/admin/reports": GlyphReports,
  "/admin/deletion-requests": GlyphDeletion,
  "/admin/config": GlyphConfig,
  "/admin/company": GlyphCompany,
  "/admin/company/customers": GlyphCustomers,
  "/admin/company/employees": GlyphMe,
  "/admin/company/jobs": GlyphJobs,
  "/admin/company/approvals": GlyphJobs,
  "/admin/company/holidays": GlyphHolidays,
  "/admin/company/attendance": GlyphAttendance,
  "/admin/me": GlyphMe,
};

const ROLE_CAPTION: Record<ConsoleRole, string> = {
  staff: "Fenzit staff",
  owner: "Company owner",
  member: "Team member",
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
    </Link>
  );
}

function UserChip({ name, role }: { name: string | null; role?: ConsoleRole }) {
  // A missing name shows the role as the chip's first line — never a
  // "(no name)" placeholder.
  // A blank or whitespace-only name counts as missing.
  const label = name !== null && name.trim() !== "" ? name : null;
  const primary = label ?? (role !== undefined ? ROLE_CAPTION[role] : "Signed in");
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

function NavLinks({ role, landing }: { role: ConsoleRole; landing: boolean }) {
  return (
    <nav className={styles.nav} aria-label="Console sections">
      {sectionsFor(role).map((section, index) => {
        const Glyph = GLYPHS[section.to] ?? GlyphMe;
        // On the landing the first section reads as where you are — the index
        // below opens with it, so the sidebar says so too. Visual only: no
        // aria-current, because the URL is still /admin.
        const leadsLanding = landing && index === 0;
        return (
          <NavLink
            key={section.to}
            to={section.to}
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
          </NavLink>
        );
      })}
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
  const navigation = useNavigation();
  const busy = navigation.state !== "idle" || revalidator.state !== "idle";

  const logOut = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  if (data.status === "failed") {
    return (
      <div className={styles.page}>
        <Container>
          <main className={styles.main}>
            <h1 className={styles.heading}>Console</h1>
            <p className={styles.error} role="alert">
              We could not check your access. Check your connection and try again.
            </p>
            <Button onClick={() => revalidator.revalidate()} disabled={busy}>
              {busy ? "Checking…" : "Try again"}
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
        <NavLinks role={data.role} landing={location.pathname.replace(/\/+$/, "") === "/admin"} />
        <div className={styles.sidebarFoot}>
          <UserChip name={data.name} role={data.role} />
          <Button variant="secondary" onClick={logOut}>
            Log out
          </Button>
        </div>
      </aside>
      <div className={wide ? styles.contentWide : styles.content}>
        <div className={styles.progress} role="progressbar" aria-hidden={!busy}>
          <span className={busy ? styles.progressFillActive : styles.progressFill} />
        </div>
        <main className={styles.main}>
          <h1 className={styles.heading}>{data.name === null ? "Hello" : `Hello, ${data.name}`}</h1>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** One plain-English line per section, shown under its name on the landing
 *  index. Keyed by the section's route, the same key the glyphs use. */
const SECTION_BLURBS: Record<string, string> = {
  "/admin/inspect": "Everything the system knows about one person, on one page.",
  "/admin/account": "Flip someone's staff and sign-in flags.",
  "/admin/reports": "Job photos people flagged, ready to hide or dismiss.",
  "/admin/deletion-requests": "People asking us to erase their data, and what we did.",
  "/admin/config": "App-wide settings — the force-update rule and the support contact.",
  "/admin/company": "Today's team pulse and your recent activity.",
  "/admin/company/customers": "The people you serve, and the jobs booked for them.",
  "/admin/company/employees": "Your team, their details and their offices.",
  "/admin/company/jobs": "Create jobs, assign them and follow them to the finish.",
  "/admin/company/holidays": "The days your team is off.",
  "/admin/company/attendance": "Who checked in, where and when.",
};

/** Members never reach the index: AdminHome sends them to Me first. */
type IndexRole = Exclude<ConsoleRole, "member">;

const LEDE: Record<IndexRole, string> = {
  staff: "The whole system, one console.",
  owner: "Your whole business, one console.",
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

/** The landing: an owner gets the job-reports dashboard (Epic 22, CAP-8 —
 *  the landing view after sign-in); everyone else sees this role's sections
 *  as an index, with the console art beside it. A member's console IS the Me
 *  section — no welcome screen to click past. */
export function AdminHome() {
  const data = useRouteLoaderData<typeof adminLoader>("admin");

  if (data === undefined) {
    return (
      <p className={styles.lede} role="status">
        Loading your console…
      </p>
    );
  }
  if (data.status === "failed") {
    return (
      <p className={styles.error} role="alert">
        We could not load your console. Check your connection and try again.
      </p>
    );
  }

  if (data.role === "member") {
    return <Navigate to="/admin/me" replace />;
  }

  if (data.role === "owner" && data.dashboard !== null) {
    return <AdminOwnerDashboard dashboard={data.dashboard} />;
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
          This console cannot delete anything.
        </p>
      ) : null}
    </div>
  );
}
