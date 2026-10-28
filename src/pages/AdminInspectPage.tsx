import { useLoaderData, useNavigation, useRevalidator } from "react-router";
import type { adminInspectLoader } from "../features/admin/adminInspectLoader";
import { GlyphInspect } from "../features/admin/components/glyphs";
import { LookupFacts, LookupScene } from "../features/admin/components/LookupScene";
import { DossierView } from "../features/admin/DossierView";
import { SearchForm } from "../features/admin/components/SearchForm";
import { SectionCard } from "../features/admin/components/SectionCard";
import { TableSkeleton } from "../features/admin/components/Table";
import styles from "./AdminInspectPage.module.css";

/** The Inspect section: search anyone, read everything. While the lookup is
 *  in flight the stale results give way to skeleton rows — loading is shown,
 *  never faked with old data. */
export function AdminInspectPage() {
  const data = useLoaderData<typeof adminInspectLoader>();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle" || revalidator.state !== "idle";
  const hasQuery = data.state !== "idle";

  return (
    <div className={styles.stack}>
      <SearchForm
        key={data.state === "found" || data.state === "not-found" ? data.phone : "idle"}
        action="/admin/inspect"
        countries={data.countries}
        defaultValue={data.state === "found" || data.state === "not-found" ? data.phone : ""}
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
                    <GlyphInspect />
                  </span>
                  Look up anyone by phone
                </h2>
                <p className={styles.idleCopy}>
                  Choose a country code, type the number, and press Search. An exact match shows the
                  person's details below.
                </p>
                <p className={styles.factsLabel}>A match shows</p>
                <LookupFacts />
              </div>
              <div className={styles.idleScene}>
                <LookupScene />
              </div>
            </div>
          ) : null}
          {data.state === "not-found" ? (
            <div className={styles.notice} role="status">
              <p className={styles.noticeTitle}>No person with this number</p>
              <p className={styles.noticeCopy}>
                {data.phone} matches nobody. Check the digits — the match is exact.
              </p>
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
          {data.state === "found" ? <DossierView d={data.dossier} /> : null}
        </>
      )}
    </div>
  );
}
