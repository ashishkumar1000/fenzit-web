import { PLAY_STORE_URL } from "../config/appStores";
import { DOWNLOAD_APP_PAGE } from "../app/pageMeta";
import { useMobilePlatform } from "../hooks/useMobilePlatform";
import { StoreBadge } from "../components/ui/StoreBadge";
import { SimplePage, SimpleSection } from "./SimplePage";
import styles from "./DownloadAppPage.module.css";

const IOS_HEADING = "Get the Fenzit app on your iPhone";

/**
 * The invite SMS link (fixed in the DLT-approved template, so the redirect lives
 * here, not in the SMS). On an Android phone the page redirects straight to the
 * Google Play listing with an instant (0-second) meta refresh — the W3C-sanctioned
 * H76 pattern; a timed pause would fail WCAG 2.2.1. React 19 hoists the meta tag
 * into <head> after hydration; most Android browsers hand play.google.com links
 * to the Play Store app, but some in-app webviews just show the web page, so the
 * badge stays as the fallback. iPhone sees the App Store badge, and desktop sees
 * one badge per platform.
 */
const REDIRECT_SECONDS = 0;

export function DownloadAppPage() {
  const platform = useMobilePlatform();

  if (platform === "android") {
    return (
      <SimplePage
        meta={DOWNLOAD_APP_PAGE}
        id="download-app-title"
        title={DOWNLOAD_APP_PAGE.title}
        lead="Taking you to Google Play to install the Fenzit app. If it does not open, tap the badge below."
      >
        {/* React 19 hoists this meta tag into <head>. */}
        <meta httpEquiv="refresh" content={`${REDIRECT_SECONDS}; url=${PLAY_STORE_URL}`} />
        <PlayBlock />
      </SimplePage>
    );
  }

  if (platform === "ios") {
    return (
      <SimplePage
        meta={DOWNLOAD_APP_PAGE}
        id="download-app-title"
        title={IOS_HEADING}
        lead="Download Fenzit from the App Store, then log in with the phone number your team invited."
      >
        <AppStoreBlock />
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
      <AppStoreBlock />
    </SimplePage>
  );
}

function PlayBlock() {
  return (
    <SimpleSection id="play-link" title="Android">
      <div className={styles.badgeWrap}>
        <StoreBadge store="play" />
      </div>
    </SimpleSection>
  );
}

function AppStoreBlock() {
  return (
    <SimpleSection id="iphone-title" title="iPhone and iPad">
      <div className={styles.badgeWrap}>
        <StoreBadge store="appStore" />
      </div>
    </SimpleSection>
  );
}
