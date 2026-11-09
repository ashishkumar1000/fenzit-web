import { useActionData, useLoaderData, useNavigation, useRevalidator } from "react-router";
import { Button } from "../components/ui/Button";
import type {
  adminConfigAction,
  adminConfigLoader,
  ConfigActionData,
} from "../features/admin/config/configLoaders";
import { ConfigForm } from "../features/admin/config/ConfigForm";
import styles from "./AdminConfigPage.module.css";

/**
 * Super-admin Config page: the force-update rule for each platform and the
 * support contact. The BE checks the caller on every read and write. The
 * layout above already shows the page's one h1.
 */
export function AdminConfigPage() {
  const data = useLoaderData<typeof adminConfigLoader>();
  const result = useActionData<typeof adminConfigAction>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const busy = navigation.state !== "idle" || revalidator.state !== "idle";

  if (data.state === "forbidden") {
    return <ForbiddenView />;
  }

  if (data.state === "failed") {
    return (
      <div className={styles.page}>
        <Intro />
        <p className={styles.alert} role="alert">
          We could not load the settings. Check your connection and try again.
        </p>
        <div>
          <Button variant="secondary" onClick={() => revalidator.revalidate()} disabled={busy}>
            {busy ? "Trying again…" : "Try again"}
          </Button>
        </div>
      </div>
    );
  }

  const serverErrors = result?.state === "invalid" ? result.fieldErrors : {};

  return (
    <div className={styles.page}>
      <Intro />
      {navigation.state === "loading" ? (
        <p className={styles.quiet}>Loading the latest settings…</p>
      ) : null}
      {/* Keyed on the saved values: after a save the form restarts from what the server now holds. */}
      <ConfigForm
        key={JSON.stringify(data.config)}
        config={data.config}
        serverErrors={serverErrors}
        saving={navigation.state !== "idle"}
        notice={<Notice result={result} />}
      />
    </div>
  );
}

/** Shown to anyone who is not a super admin. Not a redirect, so the reason is visible. */
function ForbiddenView() {
  return (
    <section className={styles.page} aria-labelledby="config-forbidden-title">
      <h2 id="config-forbidden-title" className={styles.title}>
        You do not have access to this page
      </h2>
      <p className={styles.helper}>Only super admins can change app settings.</p>
    </section>
  );
}

function Intro() {
  return (
    <header className={styles.intro}>
      <h2 className={styles.title}>App settings</h2>
      <p className={styles.helper}>
        Changes take effect for installed apps on their next launch or when they return to the
        foreground.
      </p>
    </header>
  );
}

function Notice({ result }: { result: ConfigActionData | undefined }) {
  if (result === undefined) return null;
  if (result.state === "saved") {
    return (
      <p className={styles.success} role="status">
        Saved. Installed apps pick this up on their next launch or when they come back to the
        foreground.
      </p>
    );
  }
  if (result.state === "forbidden") {
    return (
      <p className={styles.alert} role="alert">
        Only super admins can change these settings.
      </p>
    );
  }
  return (
    <p className={styles.alert} role="alert">
      {result.message}
    </p>
  );
}
