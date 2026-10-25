import { CLIENT_ONLY_TITLES } from "../app/pageMeta";
import { LinkButton } from "../components/ui/LinkButton";
import { NotFoundArt } from "../features/not-found/components/NotFoundArt";
import styles from "./NotFoundPage.module.css";

/** Shown for any address the app does not recognise. Client-only: it is not pre-rendered. */
export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <title>{CLIENT_ONLY_TITLES["404"]}</title>
      <main className={styles.main}>
        <div className={styles.visual}>
          <NotFoundArt />
        </div>
        <div className={styles.panel}>
          <h1 className={styles.heading}>This page is not here.</h1>
          <p className={styles.body}>
            The link may be wrong or old. Go home to find what you need.
          </p>
          <LinkButton to="/" variant="primary">
            Go home
          </LinkButton>
        </div>
      </main>
    </div>
  );
}
