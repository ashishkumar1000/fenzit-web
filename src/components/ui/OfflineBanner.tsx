import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import styles from "./OfflineBanner.module.css";

/** Shown across the top of the app while the browser is offline. Renders nothing when online. */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) {
    return null;
  }

  return (
    <div className={styles.banner} role="status">
      You are offline. Changes will not save until you reconnect.
    </div>
  );
}
