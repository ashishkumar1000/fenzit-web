import { Badge } from "../components/Badge";
import { Button } from "../../../components/ui/Button";
import type { GeoStatus, ImportField, ImportFlag, RowCheck, SheetRow } from "./importModel";
import { IMPORT_COLUMNS } from "./importModel";
import { ADDRESS_MIN_LENGTH } from "./useImportSheet";
import styles from "./ImportPreviewTable.module.css";

type ImportPreviewTableProps = {
  rows: SheetRow[];
  disabled: boolean;
  /** Each callback gets the row's position in the sheet, which is the backend's rowIndex. */
  onEdit: (index: number, field: ImportField, value: string) => void;
  onBlur: () => void;
  onFetch: (index: number) => void;
};

const GEO_TEXT: Record<GeoStatus, string> = {
  idle: "",
  loading: "Looking up this address…",
  found: "Location found.",
  approximate:
    "Approximate location: only an area centre was found. Check the pin before you save.",
  "not-found": "No location found. Check the address, city, state and pincode, then try again.",
  "rate-limited": "Too many lookups in a minute. Wait a minute, then fetch this row again.",
  error: "Could not look up this address. Try again.",
};

const FLAG_TEXT: Record<ImportFlag, string> = {
  no_map_pin: "No map pin",
  updates_existing: "Will update an existing customer",
  country_code_differs: "Dial code differs from the country picked for this sheet",
};

function inputModeFor(field: ImportField): "decimal" | "numeric" | "tel" | undefined {
  if (field === "latitude" || field === "longitude") return "decimal";
  if (field === "pincode") return "numeric";
  if (field === "phone") return "tel";
  return undefined;
}

/** Why "Fetch location" is off for a row, in plain English. Null means it can be pressed. */
function whyNoFetch(address: string): string | null {
  const text = address.trim();
  if (text === "") return "Add an address first.";
  if (text.length < ADDRESS_MIN_LENGTH) {
    return `The address needs at least ${ADDRESS_MIN_LENGTH} characters.`;
  }
  return null;
}

/** Every cell is editable. Each row shows its own check result, flags and location button. */
export function ImportPreviewTable({
  rows,
  disabled,
  onEdit,
  onBlur,
  onFetch,
}: ImportPreviewTableProps) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.th}>
              Row
            </th>
            {IMPORT_COLUMNS.map((column) => (
              <th key={column.field} scope="col" className={styles.th}>
                {column.header}
              </th>
            ))}
            <th scope="col" className={styles.th}>
              Map location
            </th>
            <th scope="col" className={styles.th}>
              Result
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            // Customers count from 1. The sheet row (header is row 1) is not shown.
            const number = index + 1;
            const why = whyNoFetch(row.cells.address);
            const fetchDisabled = disabled || why !== null || row.geo === "loading";
            const whyId = `fetch-why-${index}`;
            return (
              <tr key={row.rowNumber} className={styles.tr}>
                <td className={styles.rowNumber}>{number}</td>
                {IMPORT_COLUMNS.map((column) => (
                  <td key={column.field} className={styles.td}>
                    <input
                      className={styles.input}
                      value={row.cells[column.field]}
                      disabled={disabled}
                      inputMode={inputModeFor(column.field)}
                      aria-label={`${column.header}, row ${number}`}
                      onChange={(event) => onEdit(index, column.field, event.target.value)}
                      onBlur={onBlur}
                    />
                  </td>
                ))}
                <td className={styles.td}>
                  <Button
                    variant="secondary"
                    size="compact"
                    disabled={fetchDisabled}
                    describedBy={why ? whyId : undefined}
                    onClick={() => onFetch(index)}
                  >
                    Fetch location
                  </Button>
                  {why ? (
                    <p id={whyId} className={styles.note}>
                      {why}
                    </p>
                  ) : null}
                  {GEO_TEXT[row.geo] ? (
                    <p className={styles.note} role="status">
                      {GEO_TEXT[row.geo]}
                    </p>
                  ) : null}
                </td>
                <td className={styles.td}>
                  <RowResult check={row.check} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowResult({ check }: { check: RowCheck | null }) {
  if (check === null) {
    return <span className={styles.note}>Not checked yet</span>;
  }
  return (
    <div className={styles.result}>
      {check.status === "valid" ? (
        <Badge label="Ready" tone="done" />
      ) : (
        <Badge label="Needs fixing" tone="cancelled" />
      )}
      {check.flags.map((flag) => (
        <span key={flag} className={styles.flag}>
          {FLAG_TEXT[flag]}
        </span>
      ))}
      {check.reasons.length > 0 ? (
        <ul className={styles.reasons}>
          {check.reasons.map((reason, index) => (
            <li key={`${reason.code}-${index}`}>{reason.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
