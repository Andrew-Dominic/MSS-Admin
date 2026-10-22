// Admin session cookies. The MSS API access token lasts ~15 minutes and the
// refresh token rotates on every use; both live only in httpOnly cookies so
// browser code never sees them. `proxy.ts` refreshes them before they expire.

export const ACCESS_COOKIE = "mss_admin_access";
export const REFRESH_COOKIE = "mss_admin_refresh";
export const EXPIRES_COOKIE = "mss_admin_expires"; // epoch ms, not secret

/** Refresh when less than this much access-token lifetime remains. */
export const REFRESH_MARGIN_MS = 60_000;
/** Refresh tokens are long-lived; cap the cookie at 7 days of inactivity. */
const REFRESH_MAX_AGE_S = 7 * 24 * 3600;

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

interface CookieWriter {
  set(name: string, value: string, options: Record<string, unknown>): unknown;
  delete(name: string): unknown;
}

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function writeSession(cookies: CookieWriter, tokens: TokenSet): void {
  const ttl = (tokens.expires_in ?? 900) * 1000;
  cookies.set(ACCESS_COOKIE, tokens.access_token, { ...base, maxAge: Math.ceil(ttl / 1000) });
  cookies.set(REFRESH_COOKIE, tokens.refresh_token, { ...base, maxAge: REFRESH_MAX_AGE_S });
  cookies.set(EXPIRES_COOKIE, String(Date.now() + ttl), { ...base, maxAge: REFRESH_MAX_AGE_S });
}

export function clearSession(cookies: CookieWriter): void {
  cookies.delete(ACCESS_COOKIE);
  cookies.delete(REFRESH_COOKIE);
  cookies.delete(EXPIRES_COOKIE);
}
