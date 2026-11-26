import { useSyncExternalStore } from "react";
import { dismissToast, getToastsSnapshot, subscribeToasts, type ToastEntry } from "./toastStore";
import styles from "./ToastHost.module.css";

/**
 * The toast layer's host (CAP-5, 2026-11-26): one fixed stack in the admin
 * layout, above the loading overlay's z-index, reading the module store.
 * Per §5: a completion is one polite role="status"; a failure is one
 * role="alert" that never leaves on its own. Focus never moves — the toast
 * must not steal the form the user is working in; the stack is also
 * click-through-safe (only its own buttons take pointer events).
 */
export function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToastsSnapshot, () => EMPTY);
  if (toasts.length === 0) return null;
  return (
    <div className={styles.region}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={styles.toast}
          data-tone={toast.tone}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          <p className={styles.message}>{toast.message}</p>
          <button
            type="button"
            className={styles.dismiss}
            aria-label={`Dismiss notification: ${toast.message}`}
            onClick={() => dismissToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

const EMPTY: ToastEntry[] = [];
