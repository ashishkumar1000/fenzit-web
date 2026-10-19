// Direct CORS calls to fenzit-be. The browser calls the API origin from
// VITE_API_BASE_URL; fenzit-be allows this web origin through its
// CORS_ALLOWED_ORIGINS setting.

import { getApiBaseUrl } from "../config/env";

/** Longest wait for a response, including reading the body. */
export const API_TIMEOUT_MS = 15_000;

const NETWORK_MESSAGE = "Could not reach the server. Check your connection and try again.";
const TIMEOUT_MESSAGE = "The server took too long to respond. Try again.";
const UNREADABLE_MESSAGE = "The server sent a response the app could not read.";

/**
 * A failed API call. `status` is the HTTP status, or 0 when no response came
 * back (network failure or timeout). `errorCode` is the BE's `error_code`, when
 * the error body has one. Branch on `errorCode`, never on `message`.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errorCode?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const CORRELATION_HEADER = "X-Correlation-Id";
export const SESSION_HEADER = "X-Session-Id";

export interface ApiFetchOptions {
  /** Where the base URL comes from. Defaults to the build's VITE_API_BASE_URL. */
  resolveBaseUrl?: () => string;
  /** Overrides API_TIMEOUT_MS. Tests use a short value. */
  timeoutMs?: number;
  /** Overrides the global fetch. Tests use a stub. */
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
  /** Overrides the ID generator. Tests use a fixed value. */
  newId?: () => string;
}

/**
 * Builds an apiFetch with the given options. The app uses the default `apiFetch`.
 *
 * Each call sends a new `X-Correlation-Id`. Every call from this page load
 * shares one `X-Session-Id`. The BE logs both, so a bug report can be traced.
 */
export function createApiFetch(options: ApiFetchOptions = {}) {
  const resolveBaseUrl = options.resolveBaseUrl ?? getApiBaseUrl;
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const newId = options.newId ?? (() => crypto.randomUUID());
  const sessionId = newId();

  /**
   * Returns `T` from the JSON body. For an endpoint that answers `204 No Content`,
   * call `apiFetch<void>(...)`. An empty `200` breaks the JSON contract and throws.
   */
  return async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    // Resolved before the try block, so a config error is not mistaken for a network error.
    const url = `${resolveBaseUrl()}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Normalise headers first: a Headers instance or a tuple array would spread to nothing.
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    if (!headers.has(CORRELATION_HEADER)) {
      headers.set(CORRELATION_HEADER, newId());
    }
    if (!headers.has(SESSION_HEADER)) {
      headers.set(SESSION_HEADER, sessionId);
    }
    // Honour the caller's own cancel signal as well as the timeout.
    const signal = init.signal
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal;

    try {
      const response = await fetchImpl(url, { ...init, headers, signal });
      return await parseResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // The caller cancelled: pass the abort through so it is not shown as a network error.
      if (init.signal?.aborted) {
        throw error;
      }
      throw new ApiError(0, controller.signal.aborted ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    } finally {
      clearTimeout(timer);
    }
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorCode = await readErrorCode(response);
    throw new ApiError(response.status, `Request failed with status ${response.status}`, errorCode);
  }

  // 204 is a deliberate "no content" answer, so the caller asked for `void`.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (text === "") {
    throw new ApiError(response.status, UNREADABLE_MESSAGE);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, UNREADABLE_MESSAGE);
  }
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error_code" in body &&
      typeof body.error_code === "string"
    ) {
      return body.error_code;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export const apiFetch = createApiFetch();
