import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import type { adminLoader } from "../features/admin/adminLoader";
import { AdminArt } from "../features/admin/components/AdminArt";
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

/** The company admin page. A placeholder for now: a heading, a line, and a way out. */
export function AdminPage() {
  const data = useLoaderData<typeof adminLoader>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const checking = revalidator.state !== "idle";

  const logOut = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  return (
    <div className={styles.page}>
      <title>Company admin · Fenzit</title>
      <Container>
        <main className={styles.main}>
          <div className={styles.visual}>
            <AdminArt />
          </div>
          <h1 className={styles.heading}>Company admin</h1>

          {data.status === "failed" ? (
            <>
              <p className={styles.error} role="alert">
                We could not check your access. Check your connection and try again.
              </p>
              <Button onClick={() => revalidator.revalidate()} disabled={checking}>
                {checking ? "Checking…" : "Try again"}
              </Button>
            </>
          ) : data.allowed ? (
            <>
              <p className={styles.status}>
                This page is a placeholder. Company tools will appear here.
              </p>
              {data.name ? <p className={styles.status}>Signed in as {data.name}</p> : null}
              <Button variant="secondary" onClick={logOut}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <p className={styles.status}>You do not have permission to open this page.</p>
              <Button variant="secondary" onClick={logOut}>
                Log out
              </Button>
            </>
          )}
        </main>
      </Container>
    </div>
  );
}
