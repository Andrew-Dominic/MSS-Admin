"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiUrl } from "@/lib/mss/config";
import { REFRESH_COOKIE, ACCESS_COOKIE, clearSession, writeSession, type TokenSet } from "@/lib/mss/session";

/** Only same-site paths, never "//host" or "https://..." (open redirect). */
function safeRedirect(target: string | null): string {
  return target && target.startsWith("/") && !target.startsWith("//") && !target.startsWith("/\\") ? target : "/";
}

function back(error: string, redirectTo: string): never {
  redirect(`/login?error=${encodeURIComponent(error)}&redirectTo=${encodeURIComponent(redirectTo)}`);
}

async function call(path: string, init: RequestInit): Promise<Response | null> {
  try {
    return await fetch(apiUrl(path), { ...init, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  } catch {
    return null;
  }
}

/**
 * Admin sign-in: an MSS account's email and password, accepted only when the
 * API confirms the account holds the admin role.
 */
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirect(formData.get("redirectTo") as string | null);
  if (!email || !password) back("Enter your email and password.", redirectTo);

  const res = await call("/auth/password/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res) back("The MSS API could not be reached. Try again.", redirectTo);
  if (res.status === 429) back("Too many sign-in attempts. Wait a minute and try again.", redirectTo);
  if (!res.ok) back("Wrong email or password.", redirectTo);
  const tokens = (await res.json()) as TokenSet;

  // The account must be an MSS admin (server-provisioned role).
  const check = await call("/admin/security/status", {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" },
  });
  if (!check || !check.ok) {
    await call("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.access_token}`, "Content-Type": "application/json" },
      body: "{}",
    });
    back(
      check?.status === 403
        ? "This account is not an MSS admin. Ask the server administrator to grant the admin role."
        : "Could not verify admin access. Try again.",
      redirectTo,
    );
  }

  writeSession(await cookies(), tokens);
  redirect(redirectTo);
}

export async function logout() {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (access && store.get(REFRESH_COOKIE)) {
    await call("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: "{}",
    });
  }
  clearSession(store);
  redirect("/login");
}
