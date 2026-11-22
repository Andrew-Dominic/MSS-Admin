import "server-only";

/** Action label the login widget sends; tokens from other forms are rejected. */
export const TURNSTILE_ACTION = "admin_login";

/** Hostnames whose tokens are accepted (TURNSTILE_HOSTNAMES, comma list). */
const HOSTNAMES = (process.env.TURNSTILE_HOSTNAMES || "mssadmin.tech,www.mssadmin.tech")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

/**
 * Cloudflare Turnstile ("verify you are human") for the sign-in page.
 * Enforced only when both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are set,
 * so the panel keeps working (without the check) until they are configured.
 */
export function turnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY ? process.env.TURNSTILE_SITE_KEY : null;
}

/** Verifies a Turnstile response token with Cloudflare. True when the check is off. */
export async function verifyTurnstile(token: string | null, remoteIp?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.TURNSTILE_SITE_KEY) return true;
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean; hostname?: string; action?: string };
    // Success alone isn't enough: the token must come from this form on this site.
    return (
      data.success === true &&
      data.action === TURNSTILE_ACTION &&
      HOSTNAMES.includes(String(data.hostname ?? "").toLowerCase())
    );
  } catch {
    return false;
  }
}
