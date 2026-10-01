/**
 * Minimal HTTP client for the existing backend API.
 *
 * Design constraints for this phase:
 * - No new dependencies. Uses the native `fetch` API.
 * - The base URL always comes from `VITE_API_URL` (see `.env.local`). No backend
 *   URL is hardcoded in application code.
 * - Response bodies are returned exactly as the backend sent them. Nothing is
 *   unwrapped or reshaped, because the backend response envelope is not assumed
 *   here. Later phases type the result at the call site.
 * - Errors are always surfaced as `ApiError`. Nothing is swallowed, and there is
 *   deliberately no automatic logout or redirect on 401; that belongs to the
 *   authentication phase.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Values accepted in a query string. `null` and `undefined` are skipped. */
export type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue>;

/**
 * Stable, machine-readable failure categories so later phases can branch on
 * `error.code` instead of parsing messages.
 *
 * `network`, `timeout` and `aborted` mean no HTTP response was received and
 * always carry `status === 0`. Every other code mirrors the HTTP status.
 */
export type ApiErrorCode =
  | "network"
  | "timeout"
  | "aborted"
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unprocessable"
  | "rate_limited"
  | "server_error"
  | "http_error";

export interface ApiErrorInit {
  code: ApiErrorCode;
  message: string;
  status: number;
  statusText: string;
  method: string;
  url: string;
  data?: unknown;
  cause?: unknown;
}

/** The single error type thrown by every `apiClient` call. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** HTTP status, or `0` for network/timeout/abort failures. */
  readonly status: number;
  readonly statusText: string;
  readonly method: string;
  readonly url: string;
  /** Parsed JSON body, raw text body, or `undefined`. */
  readonly data: unknown;
  readonly isNetworkError: boolean;
  readonly isUnauthorized: boolean;
  readonly cause?: unknown;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status;
    this.statusText = init.statusText;
    this.method = init.method;
    this.url = init.url;
    this.data = init.data;
    this.isNetworkError = init.code === "network" || init.code === "timeout" || init.code === "aborted";
    this.isUnauthorized = init.code === "unauthorized";
    this.cause = init.cause;
  }
}

export interface RequestOptions {
  /** Bearer token for this call. Falls back to `config.getToken`. */
  token?: string | null;
  query?: QueryParams;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Overrides the client default. Use `0` to disable the timeout. */
  timeoutMs?: number;
}

export interface ApiClientConfig {
  /** Overrides `VITE_API_URL`. Used by tests and standalone scripts. */
  baseUrl?: string;
  /** Supplies the bearer token when a call does not pass one explicitly. */
  getToken?: () => string | null | undefined;
  fetchImpl?: typeof fetch;
  /** Default per-request timeout in ms. Default `30000`; `0` disables it. */
  timeoutMs?: number;
  /**
   * `fetch` credentials mode. Defaults to `"same-origin"` (the platform
   * default). The authentication phase can switch to `"include"` if the backend
   * uses cookies.
   */
  credentials?: RequestCredentials;
}

export interface ApiClient {
  /** Resolved base URL, without a trailing slash. Throws if `VITE_API_URL` is unset. */
  readonly baseUrl: string;
  request<T = unknown>(method: HttpMethod, path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  get<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function buildQueryString(query?: QueryParams): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    params.append(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const target = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === target);
}

function errorCodeForStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
      return "unprocessable";
    case 429:
      return "rate_limited";
    default:
      return status >= 500 ? "server_error" : "http_error";
  }
}

/** Best-effort human-readable message from a JSON or text error body. */
function extractMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim() !== "") return data;
  if (data !== null && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim() !== "") return value;
    }
  }
  return fallback;
}

/** Parses a response body as JSON, falling back to raw text. */
async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;
  const text = await response.text();
  if (text === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  const defaultTimeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const defaultCredentials = config.credentials ?? "same-origin";

  const resolveBaseUrl = (): string => {
    const raw = config.baseUrl ?? import.meta.env.VITE_API_URL;
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new ApiError({
        code: "network",
        message: 'API base URL is not configured. Set VITE_API_URL in your environment (see .env.local).',
        status: 0,
        statusText: "",
        method: "-",
        url: "",
      });
    }
    return normalizeBaseUrl(raw);
  };

  const request = async <T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> => {
    const baseUrl = resolveBaseUrl();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${baseUrl}${normalizedPath}${buildQueryString(options.query)}`;

    const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
    if (body !== undefined && !hasHeader(headers, "Content-Type")) {
      headers["Content-Type"] = "application/json";
    }

    const token = options.token ?? config.getToken?.() ?? null;
    if (token && !hasHeader(headers, "Authorization")) {
      headers.Authorization = `Bearer ${token}`;
    }

    const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    if (options.signal?.aborted) {
      controller.abort();
    } else {
      options.signal?.addEventListener("abort", abortFromCaller);
    }
    const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        credentials: defaultCredentials,
      });
    } catch (cause) {
      const abortedByCaller = options.signal?.aborted === true;
      if (controller.signal.aborted) {
        throw new ApiError({
          code: abortedByCaller ? "aborted" : "timeout",
          message: abortedByCaller
            ? `${method} ${normalizedPath} was aborted by the caller.`
            : `${method} ${normalizedPath} timed out after ${timeoutMs}ms.`,
          status: 0,
          statusText: "",
          method,
          url,
          cause,
        });
      }
      throw new ApiError({
        code: "network",
        message: `${method} ${normalizedPath} could not reach the API at ${baseUrl}.`,
        status: 0,
        statusText: "",
        method,
        url,
        cause,
      });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      options.signal?.removeEventListener("abort", abortFromCaller);
    }

    const data = await parseBody(response);

    if (!response.ok) {
      throw new ApiError({
        code: errorCodeForStatus(response.status),
        message: extractMessage(data, `${method} ${normalizedPath} failed with HTTP ${response.status}.`),
        status: response.status,
        statusText: response.statusText,
        method,
        url,
        data,
      });
    }

    return data as T;
  };

  return {
    get baseUrl(): string {
      return resolveBaseUrl();
    },
    request,
    get: <T = unknown>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
    post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>("POST", path, body, options),
    put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>("PUT", path, body, options),
    patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>("PATCH", path, body, options),
    delete: <T = unknown>(path: string, options?: RequestOptions) => request<T>("DELETE", path, undefined, options),
  };
}

/**
 * Shared client used by the application. The base URL is resolved lazily from
 * `import.meta.env.VITE_API_URL` so that importing this module never throws.
 */
export const apiClient: ApiClient = createApiClient();

export default apiClient;
