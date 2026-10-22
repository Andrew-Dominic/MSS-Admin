import { NextResponse, type NextRequest } from "next/server";
import { apiUrl } from "@/lib/mss/config";
import {
  ACCESS_COOKIE,
  EXPIRES_COOKIE,
  REFRESH_COOKIE,
  REFRESH_MARGIN_MS,
  clearSession,
  writeSession,
  type TokenSet,
} from "@/lib/mss/session";

// Every page needs an MSS admin session. The access token is refreshed here
// (the only place besides Server Actions that may set cookies) shortly before
// it expires, so pages and actions always see a valid bearer. Whether the
// account is really an admin is enforced by the API on every call (403).
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === "/login";
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refresh) {
    if (isLogin) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?redirectTo=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isLogin) return NextResponse.redirect(new URL("/", request.url));

  const expires = Number(request.cookies.get(EXPIRES_COOKIE)?.value ?? 0);
  const hasAccess = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
  if (hasAccess && expires - Date.now() > REFRESH_MARGIN_MS) return NextResponse.next();

  // Rotate the tokens.
  let tokens: TokenSet | null = null;
  try {
    const res = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
    });
    if (res.ok) tokens = (await res.json()) as TokenSet;
  } catch {
    // API unreachable: fall through to sign-in.
  }

  if (!tokens?.access_token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "Your session has ended. Please sign in again.");
    const res = NextResponse.redirect(url);
    clearSession(res.cookies);
    return res;
  }

  // Make the fresh token visible to this same request's server render...
  request.cookies.set(ACCESS_COOKIE, tokens.access_token);
  request.cookies.set(REFRESH_COOKIE, tokens.refresh_token);
  const res = NextResponse.next({ request });
  // ...and store it in the browser.
  writeSession(res.cookies, tokens);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
