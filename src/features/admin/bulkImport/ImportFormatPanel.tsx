import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { DialCodeSelect } from "../../../components/ui/DialCodeSelect";
import type { CountryCode } from "../../../services/countryCodes";
import { IMPORT_COLUMNS, IMPORT_MAX_BYTES, IMPORT_MAX_ROWS } from "./importModel";
import { downloadSampleCsv, downloadSampleXlsx } from "./sampleFile";
import { DataTable, type TableCell } from "../components/Table";
import styles from "./ImportFormatPanel.module.css";

const SAMPLE_FAILED_MESSAGE = "Could not build the sample file. Try the .csv sample instead.";

const COLUMN_ROWS: TableCell[][] = IMPORT_COLUMNS.map((column) => [
  { text: column.header, quiet: true },
  { text: column.required ? "Yes" : "No" },
  { text: column.rule },
]);

type ImportFormatPanelProps = {
  countries: CountryCode[];
  dialCode: string;
  onDialCodeChange: (dialCode: string) => void;
  disabled: boolean;
};

/**
 * What the sheet must look like, shown before upload. Also the place for the
 * phone country (one for the whole sheet) and the two sample downloads.
 */
export function ImportFormatPanel({
  countries,
  dialCode,
  onDialCodeChange,
  disabled,
}: ImportFormatPanelProps) {
  const [sampleError, setSampleError] = useState<string | null>(null);

  async function onSampleXlsx(): Promise<void> {
    setSampleError(null);
    try {
      await downloadSampleXlsx();
    } catch {
      setSampleError(SAMPLE_FAILED_MESSAGE);
    }
  }

  return (
    <div className={styles.panel}>
      <p className={styles.lead}>
        Use one header row, then one customer per row. Column names are not case-sensitive. Extra
        columns are ignored.
      </p>
      <DataTable columns={["Column", "Needed", "What to enter"]} rows={COLUMN_ROWS} empty="" />

      <ul className={styles.rules}>
        <li>
          Fetch location uses every filled address part: address, city, state and pincode. Filling
          city and state improves the match.
        </li>
        <li>
          If a phone has no dial code, the country below applies to the whole sheet. A dial code in
          the row wins.
        </li>
        <li>Blank latitude and longitude are fine. The row is saved, and it has no map pin.</li>
        <li>
          A phone that already exists for this company updates that customer. Only the cells you
          fill in change.
        </li>
        <li>
          Limits: {IMPORT_MAX_ROWS} rows, {IMPORT_MAX_BYTES / (1024 * 1024)} MB, .xlsx or .csv.
        </li>
      </ul>

      <div className={styles.country}>
        <p className={styles.countryLabel}>Country for phones without a dial code</p>
        <DialCodeSelect
          id="import-dial-code"
          name="importDialCode"
          countries={countries}
          value={dialCode}
          onChange={onDialCodeChange}
          disabled={disabled}
        />
      </div>

      <div className={styles.samples}>
        <p className={styles.sampleCopy}>
          The sample has one example row, named &quot;EXAMPLE - delete this row&quot;. Delete it
          before you upload.
        </p>
        <div className={styles.sampleButtons}>
          <Button variant="secondary" onClick={() => void onSampleXlsx()}>
            Download sample .xlsx
          </Button>
          <Button variant="secondary" onClick={downloadSampleCsv}>
            Download sample .csv
          </Button>
        </div>
        {sampleError ? (
          <p className={styles.error} role="alert">
            {sampleError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
