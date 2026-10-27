import {
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
import { ConsoleArt, GlyphInspect } from "../features/admin/components/glyphs";
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

const ROLE_LABEL: Record<ConsoleRole, string> = {
  staff: "fenzit staff",
  owner: "company owner",
  member: "team member",
};

/** The console layout: header, the sections this role has, then the section.
 *  A thin progress bar rides the header while any section's loader runs. */
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

  return (
    <div className={styles.page}>
      <title>{CLIENT_ONLY_TITLES["/admin"]}</title>
      <Container>
        <main className={styles.main}>
          {data.status === "failed" ? (
            <>
              <h1 className={styles.heading}>Console</h1>
              <p className={styles.error} role="alert">
                We could not check your access. Check your connection and try again.
              </p>
              <Button onClick={() => revalidator.revalidate()} disabled={busy}>
                {busy ? "Checking…" : "Try again"}
              </Button>
            </>
          ) : (
            <>
              <header className={styles.top} aria-busy={busy}>
                <div className={styles.who}>
                  <p className={styles.eyebrow}>Fenzit console</p>
                  <h1 className={styles.heading}>
                    {data.name === null ? "Hello" : `Hello, ${data.name}`}
                  </h1>
                  <p className={styles.roleLine}>Signed in as {ROLE_LABEL[data.role]}</p>
                </div>
                <Button variant="secondary" onClick={logOut}>
                  Log out
                </Button>
              </header>
              <div className={styles.progress} role="progressbar" aria-hidden={!busy}>
                <span className={busy ? styles.progressFillActive : styles.progressFill} />
              </div>
              <nav className={styles.tabs} aria-label="Console sections">
                {sectionsFor(data.role).map((section) => (
                  <NavLink
                    key={section.to}
                    to={section.to}
                    className={({ isActive }) =>
                      isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
                    }
                  >
                    {section.label}
                  </NavLink>
                ))}
              </nav>
              <Outlet />
            </>
          )}
        </main>
      </Container>
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
          The Company section shows today's team pulse, your roster, leave requests and your
          company's audit trail — your company only.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.home}>
      <p className={styles.homeCopy}>
        The Me section shows your attendance, leave and jobs — your data only.
      </p>
    </div>
  );
}
