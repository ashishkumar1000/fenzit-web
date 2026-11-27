import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Generates the employment form's contract from the backend's committed
 * schema snapshot (`contracts/employment.schema.json`, produced by
 * `bun run contract:employment` in fenzit-be). The field list and the
 * constraints are the BE's; this repo only decides how they are presented.
 *
 * `--check` regenerates in memory and fails if the committed file is stale,
 * so `bun run build` catches a forgotten sync.
 */

type FieldSchema = {
  type?: string;
  maxLength?: number;
  pattern?: string;
  format?: string;
};

type Schema = {
  type?: string;
  properties?: Record<string, FieldSchema>;
};

const schemaPath = join(process.cwd(), "contracts", "employment.schema.json");
const outPath = join(process.cwd(), "src", "features", "admin", "employmentContract.generated.ts");

function render(): string {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as Schema;
  const properties = schema.properties;
  if (properties === undefined || Object.keys(properties).length === 0) {
    throw new Error(`${schemaPath} has no properties — regenerate it from fenzit-be.`);
  }
  const lines: string[] = [
    "/**",
    " * Generated from the backend's UpdateEmploymentDto OpenAPI schema.",
    " * Do not edit by hand: update the BE DTO, run `bun run contract:employment`",
    " * in fenzit-be, copy `contracts/employment.schema.json` here, then run",
    " * `bun run sync:employment-contract`.",
    " */",
    "",
    "export const EMPLOYMENT_FIELDS = [",
    ...Object.keys(properties).map((field) => `  "${field}",`),
    "] as const;",
    "",
    "export type EmploymentField = (typeof EMPLOYMENT_FIELDS)[number];",
    "",
    "export interface EmploymentFieldRules {",
    "  readonly maxLength?: number;",
    "  readonly pattern?: string;",
    "  readonly format?: string;",
    "}",
    "",
    "export const EMPLOYMENT_FIELD_RULES: Record<EmploymentField, EmploymentFieldRules> = {",
  ];
  for (const [field, rule] of Object.entries(properties)) {
    const parts: string[] = [];
    if (rule.maxLength !== undefined) parts.push(`maxLength: ${rule.maxLength}`);
    if (rule.pattern !== undefined) parts.push(`pattern: ${JSON.stringify(rule.pattern)}`);
    if (rule.format !== undefined) parts.push(`format: ${JSON.stringify(rule.format)}`);
    lines.push(`  ${field}: { ${parts.join(", ")} },`);
  }
  lines.push("};", "");
  return lines.join("\n");
}

const next = render();
if (process.argv.includes("--check")) {
  const current = readFileSync(outPath, "utf8");
  if (current !== next) {
    console.error(
      "employmentContract.generated.ts is stale — run `bun run sync:employment-contract`.",
    );
    process.exit(1);
  }
  console.log("The employment contract is current.");
} else {
  writeFileSync(outPath, next);
  console.log(`Wrote ${outPath}`);
}
