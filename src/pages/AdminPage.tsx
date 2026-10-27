import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLoaderData,
  useNavigate,
  useNavigation,
  useRevalidator,
  useRouteLoaderData,
} from "react-router";
import { CLIENT_ONLY_TITLES } from "../app/pageMeta";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { sectionsFor } from "../features/admin/adminLoader";
import type { adminLoader, ConsoleRole } from "../features/admin/adminLoader";
import {
  ConsoleArt,
  GlyphAccount,
  GlyphAttendance,
  GlyphCompany,
  GlyphCustomers,
  GlyphHolidays,
  GlyphInspect,
  GlyphJobs,
  GlyphMe,
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

const GLYPHS: Record<string, (props: { size?: number }) => React.JSX.Element> = {
  "/admin/inspect": GlyphInspect,
  "/admin/account": GlyphAccount,
  "/admin/company": GlyphCompany,
  "/admin/company/customers": GlyphCustomers,
  "/admin/company/employees": GlyphMe,
  "/admin/company/jobs": GlyphJobs,
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
  return (
    <span className={styles.chip}>
      <span className={styles.chipGlyph} aria-hidden="true">
        <GlyphMe size={15} />
      </span>
      <span className={styles.chipText}>
        <span className={styles.chipName}>{name ?? "(no name)"}</span>
        {role !== undefined ? <span className={styles.chipRole}>{ROLE_CAPTION[role]}</span> : null}
      </span>
    </span>
  );
}

function NavLinks({ role }: { role: ConsoleRole }) {
  return (
    <nav className={styles.nav} aria-label="Console sections">
      {sectionsFor(role).map((section) => {
        const Glyph = GLYPHS[section.to] ?? GlyphMe;
        return (
          <NavLink
            key={section.to}
            to={section.to}
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
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
        <NavLinks role={data.role} />
        <div className={styles.sidebarFoot}>
          <UserChip name={data.name} role={data.role} />
          <Button variant="secondary" onClick={logOut}>
            Log out
          </Button>
        </div>
      </aside>
      <div className={styles.content}>
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

/** The landing section: what this role's console can do. Reads the layout
 *  route's data by id — the index route has no loader of its own. */
export function AdminHome() {
  const data = useRouteLoaderData<typeof adminLoader>("admin");
  if (data === undefined || data.status === "failed") return null;

  if (data.role === "staff") {
    return (
      <div className={styles.home}>
        <div className={styles.homeArt}>
          <ConsoleArt />
        </div>
        <p className={styles.homeTitle}>
          <span className={styles.homeGlyph} aria-hidden="true">
            <GlyphInspect />
          </span>
          Two sections, the whole system
        </p>
        <p className={styles.homeCopy}>
          Inspect lays out everything the system knows about one person. Account flips their staff
          and sign-in flags. Destructive work stays in the owner's super CLI — this console cannot
          delete anything.
        </p>
      </div>
    );
  }

  if (data.role === "owner") {
    return (
      <div className={styles.home}>
        <p className={styles.homeCopy}>
          The Overview shows today's team pulse and your recent leave and audit activity. The
          sidebar carries the full lists — customers, employees, jobs, holidays and attendance.
        </p>
      </div>
    );
  }

  // An employee's console IS the Me section — no welcome screen to click past.
  if (data.role === "member") {
    return <Navigate to="/admin/me" replace />;
  }

  return (
    <div className={styles.home}>
      <p className={styles.homeCopy}>
        The Me section shows your attendance, leave and jobs — your data only.
      </p>
    </div>
  );
}
