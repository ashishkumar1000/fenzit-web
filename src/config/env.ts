/**
 * Public, build-time settings. Every VITE_ value is compiled into the browser
 * bundle, so nothing secret belongs here.
 *
 * Read through these functions, not `import.meta.env` directly, so a missing
 * or malformed value fails at the point of use with a clear message.
 */

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Checks and normalises VITE_API_BASE_URL. The value must be an http(s) origin,
 * optionally with a path prefix. Paths such as `/api/v1/jobs` are added by the
 * caller, so the base should not end in a slash.
 */
export function resolveApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  const withoutTrailingSlashes = trimmed.replace(/\/+$/, "");

  // Checked after the slashes are stripped, so "/" counts as unset too.
  if (withoutTrailingSlashes === "") {
    throw new Error(
      "VITE_API_BASE_URL is not set. Copy .env.example to .env.local and set it to the fenzit-be URL.",
    );
  }

  let url: URL;
  try {
    url = new URL(withoutTrailingSlashes);
  } catch {
    throw new Error(
      `VITE_API_BASE_URL must be a full URL such as https://api.fenzit.com (got "${trimmed}").`,
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`VITE_API_BASE_URL must use http or https (got "${trimmed}").`);
  }

  // Plain http is allowed only for a local development server. Anywhere else
  // the API calls would travel unencrypted.
  if (url.protocol === "http:" && !LOCAL_HOSTNAMES.has(url.hostname)) {
    throw new Error(`VITE_API_BASE_URL must use https outside localhost (got "${trimmed}").`);
  }

  // The app adds paths such as /api/v1/jobs to this value. A query, a hash, or
  // credentials would end up in the middle of every request.
  if (url.search !== "" || url.hash !== "" || url.username !== "" || url.password !== "") {
    throw new Error(
      `VITE_API_BASE_URL must be a plain origin with no query, hash, or username (got "${trimmed}").`,
    );
  }

  return withoutTrailingSlashes;
}

/** The fenzit-be base URL for this build. Throws if it is missing or malformed. */
export function getApiBaseUrl(): string {
  return resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
}
