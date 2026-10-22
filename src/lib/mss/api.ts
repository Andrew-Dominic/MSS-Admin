import "server-only";
import { cookies } from "next/headers";
import { apiUrl } from "./config";
import { ACCESS_COOKIE } from "./session";

/** An error answered by the MSS API (or a transport failure, status 0). */
export class MssApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(`${status} ${code}`);
    this.name = "MssApiError";
  }
}

export interface MssResponse<T> {
  status: number;
  data: T;
  etag: string | null;
}

interface CallOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Raw body (e.g. a ZIP upload); sent as-is with the given content type. */
  rawBody?: { bytes: Uint8Array; contentType: string };
  headers?: Record<string, string>;
  /** Send without the admin bearer (login, refresh). */
  anonymous?: boolean;
  timeoutMs?: number;
}

/**
 * Calls the MSS API from the server with the signed-in admin's bearer token.
 * Never import this into client components.
 */
export async function mssApi<T = unknown>(path: string, opts: CallOptions = {}): Promise<MssResponse<T>> {
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  if (!opts.anonymous) {
    const token = (await cookies()).get(ACCESS_COOKIE)?.value;
    if (!token) throw new MssApiError(401, "NOT_SIGNED_IN");
    headers.Authorization = `Bearer ${token}`;
  }
  let body: BodyInit | undefined;
  if (opts.rawBody) {
    headers["Content-Type"] = opts.rawBody.contentType;
    body = opts.rawBody.bytes as unknown as BodyInit;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: opts.method ?? "GET",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
    });
  } catch (e) {
    throw new MssApiError(0, "API_UNREACHABLE", (e as Error).message);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const obj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    throw new MssApiError(res.status, String(obj.error ?? `HTTP_${res.status}`), obj.details ?? obj.message);
  }
  return { status: res.status, data: data as T, etag: res.headers.get("etag") };
}

/** Human-readable message for an API error code, for the admin UI. */
export function describeError(e: unknown): string {
  if (!(e instanceof MssApiError)) return e instanceof Error ? e.message : "Unexpected error";
  const known: Record<string, string> = {
    NOT_SIGNED_IN: "Your session has ended. Please sign in again.",
    UNAUTHORIZED: "Your session has ended. Please sign in again.",
    FORBIDDEN: "This account is not an MSS admin.",
    API_UNREACHABLE: "The MSS API could not be reached. Check the connection and try again.",
    SCHEME_DRAFT_EXISTS: "This scheme already has an open draft. Edit or discard that draft first.",
    SCHEME_DRAFT_CHANGED: "Someone else changed this draft. Reload it and try again.",
    SCHEME_DRAFT_CLOSED: "This draft is already published or discarded.",
    SCHEME_DRAFT_BASE_CHANGED: "The published scheme changed since this draft was made. Create a fresh draft.",
    SCHEME_PREVIEW_CHANGED: "The catalogue changed since the preview. Upload the file again.",
    SCHEME_UPLOAD_INVALID: "The upload has invalid records and cannot be staged.",
    SCHEME_NOT_FOUND: "No published scheme has this ID.",
    IDEMPOTENCY_CONFLICT: "This request was already sent with different content. Reload the page and try again.",
    INVALID_SCHEME_REVIEW: "The review note must be 10 to 2000 characters.",
    INVALID_SCHEME_DRAFT: "The scheme record is not valid. Check required fields (ID, collection, English name, level, state).",
    INVALID_SCHEME_UPLOAD: "The upload file is not in the expected format.",
    INVALID_SCHEME_RELATION_OR_ALIAS: "A related scheme ID or alias is not valid.",
    NOTIFICATION_OWNER_NOT_FOUND: "No user has this user ID.",
    NOTIFICATION_DELIVERY_UNAVAILABLE: "Notifications are not available on the server right now.",
    AUTH_RATE_LIMITED: "Too many requests. Wait a minute and try again.",
    NOTIFICATIONS_RATE_LIMITED: "Notification limit reached (5 broadcasts per hour per admin). Try again later with the same form; it will not send twice.",
    BROADCAST_NOT_FOUND: "This broadcast doesn't exist.",
    INVALID_NOTIFICATION_PUBLISH: "The title must be 1 to 200 characters and the message 1 to 5000, in plain text.",
    INVALID_REQUEST: "The server rejected the request. Check the audience (states and languages) and try again.",
    IDEMPOTENCY_KEY_REQUIRED: "The request was missing its retry key. Reload the page and try again.",
    INVALID_IDEMPOTENCY_KEY: "The request's retry key was invalid. Reload the page and try again.",
    SCHEME_NOTIFICATION_SCOPE_UNRESOLVED: "Some published schemes have no clear state coverage, so the server can't tell whom to notify. Publish without notifying, or fix the schemes' coverage first.",
    SCHEME_DRAFT_NOT_APPROVED: "A selected draft is no longer approved. Reload and try again.",
    SCHEME_CATALOG_EMPTY: "Publishing this would leave the catalogue empty.",
    SCHEME_CATALOG_INVALID: "The resulting catalogue failed validation. Check the drafts.",
    SCHEME_CATALOG_TOO_LARGE: "The resulting catalogue is too large to publish.",
    INVALID_CREDENTIALS: "Wrong email or password.",
  };
  const detail = Array.isArray(e.details)
    ? e.details.map((d) => (typeof d === "object" ? Object.values(d as object).join(" ") : String(d))).join("; ")
    : "";
  return (known[e.code] ?? `${e.code} (HTTP ${e.status})`) + (detail ? ` — ${detail}` : "");
}
