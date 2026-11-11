import { APP_STORE_URL, PLAY_STORE_URL } from "../config/appStores";
import { DOWNLOAD_APP_PAGE } from "../app/pageMeta";
import { useMobilePlatform } from "../hooks/useMobilePlatform";
import { SimplePage, SimpleSection } from "./SimplePage";
import styles from "./DownloadAppPage.module.css";

const IPHONE_HEADING = "The iPhone app is coming soon";
const IPHONE_LINE = "Ask your employer for the link again when it is ready.";

/**
 * The invite SMS link. Android sees the Play button (no automatic redirect, so the
 * visitor always sees what they are installing). Android and desktop see the Play button.
 * iPhone and desktop see the iPhone coming-soon block, with an App Store button only once
 * APP_STORE_URL is set.
 */
export function DownloadAppPage() {
  const platform = useMobilePlatform();

  if (platform === "android") {
    return (
      <SimplePage
        meta={DOWNLOAD_APP_PAGE}
        id="download-app-title"
        title={DOWNLOAD_APP_PAGE.title}
        lead="Install the Fenzit app, then log in with your phone number."
      >
        <PlayBlock />
      </SimplePage>
    );
  }

  if (platform === "ios") {
    return (
      <SimplePage
        meta={DOWNLOAD_APP_PAGE}
        id="download-app-title"
        title={IPHONE_HEADING}
        lead={IPHONE_LINE}
      >
        {APP_STORE_URL !== null ? <AppStoreButton href={APP_STORE_URL} /> : null}
      </SimplePage>
    );
  }

  return (
    <SimplePage
      meta={DOWNLOAD_APP_PAGE}
      id="download-app-title"
      title={DOWNLOAD_APP_PAGE.title}
      lead="Open this link on your phone to install the Fenzit app. Then log in with your phone number."
    >
      <PlayBlock />
      <SimpleSection id="iphone-title" title={IPHONE_HEADING} paragraphs={[IPHONE_LINE]}>
        {APP_STORE_URL !== null ? <AppStoreButton href={APP_STORE_URL} /> : null}
      </SimpleSection>
    </SimplePage>
  );
}

function PlayBlock() {
  return (
    <SimpleSection id="play-link" title="Android">
      <a className={styles.button} href={PLAY_STORE_URL} rel="noopener noreferrer">
        Get it on Google Play
      </a>
    </SimpleSection>
  );
}

function AppStoreButton({ href }: { href: string }) {
  return (
    <a className={styles.button} href={href} rel="noopener noreferrer">
      Download on the App Store
    </a>
  );
}
