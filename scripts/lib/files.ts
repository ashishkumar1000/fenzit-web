import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";

/** SHA-256 of a file's bytes, as lowercase hex. */
export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

export function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}
