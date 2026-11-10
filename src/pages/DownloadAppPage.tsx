import { APP_STORE_URL, PLAY_STORE_URL } from "../config/appStores";
import { DOWNLOAD_APP_PAGE } from "../app/pageMeta";
import { useMobilePlatform } from "../hooks/useMobilePlatform";
import { StoreBadge } from "../components/ui/StoreBadge";
import { SimplePage, SimpleSection } from "./SimplePage";
import styles from "./DownloadAppPage.module.css";

const IPHONE_HEADING = "The iPhone app is coming soon";
const IPHONE_LINE = "Ask your employer for the link again when it is ready.";

/**
 * The invite SMS link (fixed in the DLT-approved template, so the redirect lives
 * here, not in the SMS). On an Android phone the page redirects straight to the
 * Google Play listing with an instant (0-second) meta refresh — the W3C-sanctioned
 * H76 pattern; a timed pause would fail WCAG 2.2.1. React 19 hoists the meta tag
 * into <head> after hydration; most Android browsers hand play.google.com links
 * to the Play Store app, but some in-app webviews just show the web page, so the
 * badge stays as the fallback. iPhone sees the coming-soon block, and desktop
 * sees the badge plus the coming-soon block, with an App Store button only once
 * APP_STORE_URL is set.
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
      <div className={styles.badgeWrap}>
        <StoreBadge />
      </div>
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
