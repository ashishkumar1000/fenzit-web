import { APP_STORE_URL, PLAY_STORE_URL } from "../config/appStores";
import { DOWNLOAD_APP_PAGE } from "../app/pageMeta";
import { useMobilePlatform } from "../hooks/useMobilePlatform";
import { useRedirectTo } from "../hooks/useRedirectTo";
import { SimplePage, SimpleSection } from "./SimplePage";
import styles from "./DownloadAppPage.module.css";

/**
 * Redirect page for invite SMS links. Android goes straight to the Play Store.
 * iOS sees a coming-soon note, with the App Store button only once APP_STORE_URL
 * is set. Desktop is told to open the link on a phone.
 */
export function DownloadAppPage() {
  const platform = useMobilePlatform();
  useRedirectTo(platform === "android" ? PLAY_STORE_URL : null);

  if (platform === "android") {
    return (
      <SimplePage
        meta={DOWNLOAD_APP_PAGE}
        id="download-app-title"
        title="Opening Google Play"
        lead="You are being sent to the Fenzit app on Google Play. If nothing happens, use the link below."
      >
        <SimpleSection id="play-link" title="Google Play">
          <a className={styles.button} href={PLAY_STORE_URL} rel="noopener noreferrer">
            Open Google Play
          </a>
        </SimpleSection>
      </SimplePage>
    );
  }

  if (platform === "ios") {
    return (
      <SimplePage
        meta={DOWNLOAD_APP_PAGE}
        id="download-app-title"
        title="The iOS app is coming soon"
        lead="The Fenzit iOS app is not available yet. Ask your employer for the link again when it is ready."
      >
        {APP_STORE_URL !== null ? (
          <SimpleSection id="app-store-link" title="App Store">
            <a className={styles.button} href={APP_STORE_URL} rel="noopener noreferrer">
              Download on the App Store
            </a>
          </SimpleSection>
        ) : null}
      </SimplePage>
    );
  }

  return (
    <SimplePage
      meta={DOWNLOAD_APP_PAGE}
      id="download-app-title"
      title="Open this link on your phone"
      lead="The Fenzit app is for Android and iOS phones. Open this link on your phone to get it."
    >
      {null}
    </SimplePage>
  );
}
