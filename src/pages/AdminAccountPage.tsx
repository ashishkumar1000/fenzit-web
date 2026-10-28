import { useLoaderData, useNavigation, useRevalidator } from "react-router";
import type { adminAccountLoader } from "../features/admin/adminAccountLoader";
import { DossierView } from "../features/admin/DossierView";
import { AccountScene } from "../features/admin/components/AccountScene";
import { FlagControls } from "../features/admin/components/FlagControls";
import { GlyphAccount } from "../features/admin/components/glyphs";
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
  const phone = data.state === "found" || data.state === "not-found" ? data.phone : "";

  return (
    <div className={styles.stack}>
      <SearchForm
        key={phone === "" ? "idle" : phone}
        action="/admin/account"
        countries={data.countries}
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
            <div className={styles.idle}>
              <div className={styles.idleText}>
                <h2 className={styles.idleTitle}>
                  <span className={styles.glyph} aria-hidden="true">
                    <GlyphAccount />
                  </span>
                  Change what a person can do
                </h2>
                <p className={styles.idleCopy}>
                  Search for a phone number to see that person's access. Every change asks you to
                  confirm first. A staff account can only be removed from staff. It cannot be turned
                  off here.
                </p>
                <p className={styles.factsLabel}>You can</p>
                <ul className={styles.facts} role="list">
                  <li>Make someone staff</li>
                  <li>Stop an account from signing in</li>
                  <li>Let an account sign in again</li>
                  <li>Remove someone from staff</li>
                </ul>
              </div>
              <div className={styles.idleScene}>
                <AccountScene />
              </div>
            </div>
          ) : null}
          {data.state === "not-found" ? (
            <div className={styles.notice} role="status">
              <p className={styles.noticeTitle}>No one has this number</p>
              <p className={styles.noticeCopy}>No one has the number {data.phone}.</p>
            </div>
          ) : null}
          {data.state === "invalid" ? (
            <div className={styles.notice} role="status">
              <p className={styles.noticeTitle}>That number does not look right</p>
              <p className={styles.noticeCopy}>
                Check the country code and the number, then try again.
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
