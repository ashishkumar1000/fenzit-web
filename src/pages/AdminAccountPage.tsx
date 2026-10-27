import { useLoaderData, useNavigation, useRevalidator } from "react-router";
import type { adminAccountLoader } from "../features/admin/adminAccountLoader";
import { DossierView } from "../features/admin/DossierView";
import { FlagControls } from "../features/admin/components/FlagControls";
import { SearchForm } from "../features/admin/components/SearchForm";
import { SectionCard } from "../features/admin/components/SectionCard";
import { TableSkeleton } from "../features/admin/components/Table";
import styles from "./AdminAccountPage.module.css";

/** The Account section: find a person, then flip their flags — with confirms.
 *  While the lookup is in flight the stale results give way to skeleton rows. */
export function AdminAccountPage() {
  const data = useLoaderData<typeof adminAccountLoader>();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle" || revalidator.state !== "idle";
  const hasQuery = data.state !== "idle";
  const phone =
    data.state === "found" || data.state === "not-found" || data.state === "invalid"
      ? data.phone
      : "";

  return (
    <div className={styles.stack}>
      <SearchForm
        key={phone === "" ? "idle" : phone}
        action="/admin/account"
        defaultValue={phone}
        busy={busy}
      />
      {busy && hasQuery ? (
        <SectionCard title="Searching…">
          <TableSkeleton rows={4} />
        </SectionCard>
      ) : (
        <>
          {data.state === "idle" ? (
            <p className={styles.note}>
              Search a phone number to see that person's flags. Staff accounts can only be demoted
              here; regular accounts can be promoted, disabled and re-enabled.
            </p>
          ) : null}
          {data.state === "not-found" ? (
            <div className={styles.notice} role="status">
              <p className={styles.noticeTitle}>No person with this number</p>
              <p className={styles.noticeCopy}>{data.phone} matches nobody.</p>
            </div>
          ) : null}
          {data.state === "invalid" ? (
            <div className={styles.notice} role="status">
              <p className={styles.noticeTitle}>That is not an Indian mobile number</p>
              <p className={styles.noticeCopy}>
                Enter a 10-digit number, with an optional 91 or +91 in front.
              </p>
            </div>
          ) : null}
          {data.state === "error" ? (
            <div className={styles.notice} role="alert">
              <p className={styles.noticeTitle}>The lookup failed</p>
              <p className={styles.noticeCopy}>Check your connection and search again.</p>
            </div>
          ) : null}
          {data.state === "found" ? (
            <>
              <FlagControls
                user={data.dossier.user}
                isSelf={data.dossier.user.id === data.meUserId}
                phone={data.phone}
              />
              <DossierView d={data.dossier} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
