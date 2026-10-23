import "server-only";
import tls from "node:tls";
import { MSS_API_BASE } from "@/lib/mss/config";
import type { AgentData, Check, GithubData, Level, StatusPayload, Tile } from "./types";

// System status checks (merged from the MSS Status dashboard). Read-only.
const API = MSS_API_BASE;
const API_HOST = new URL(API).hostname;
const OLD_HOST = process.env.OLD_API_HOST || "api.msmeschemes.org";
const REPO = process.env.GITHUB_REPO || "Roger-Chris/MSS_App";
const UA = "mss-admin-status/1.0";

interface Res {
  code: number;
  ms: number;
  body: unknown;
  headers: Headers | null;
  error?: string;
}

async function call(url: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Res> {
  const t = Date.now();
  try {
    const r = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: init.redirect ?? "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json", "User-Agent": UA, ...(init.headers as Record<string, string>) },
    });
    const text = await r.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text.slice(0, 200);
    }
    return { code: r.status, ms: Date.now() - t, body, headers: r.headers };
  } catch (e) {
    return { code: 0, ms: Date.now() - t, body: null, headers: null, error: (e as Error).message };
  }
}

const err = (r: Res) => (r.body && typeof r.body === "object" ? String((r.body as Record<string, unknown>).error ?? "") : r.error ?? "");
const obj = (r: Res) => (r.body && typeof r.body === "object" ? (r.body as Record<string, unknown>) : {});

/** Read-only API checks: public endpoints plus "refuses without login" guards. Nothing here writes data. */
async function apiChecks(): Promise<{ checks: Check[]; version?: string; dbOk?: boolean }> {
  const c: Check[] = [];
  const add = (id: string, group: string, name: string, level: Level, detail: string, ms?: number) =>
    c.push({ id, group, name, level, detail, ms });

  const [health, root, latest, current, legal, promoEn, promoBad, me, profile, schemes, admin, refresh, missing, plain, old] =
    await Promise.all([
      call(`${API}/v1/health`),
      call(`${API}/`),
      call(`${API}/v1/catalog/schemes/latest`),
      call(`${API}/v1/catalog/current`),
      call(`${API}/v1/legal-documents`),
      call(`${API}/v1/promotions?language=en`),
      call(`${API}/v1/promotions?language=zz`),
      call(`${API}/v1/me`),
      call(`${API}/v1/me/profile`),
      call(`${API}/v1/schemes`),
      call(`${API}/v1/admin/schemes/drafts`),
      call(`${API}/v1/auth/refresh`, {
        method: "POST",
        body: JSON.stringify({ refresh_token: "status-dashboard-probe" }),
        headers: { "Content-Type": "application/json" },
      }),
      call(`${API}/v1/status-dashboard-no-such-route`),
      call(`http://${API_HOST}/v1/health`, { redirect: "manual" }),
      call(`https://${OLD_HOST}/v1/health`, {}, 6000),
    ]);

  const h = obj(health);
  const dbOk = h.db === "ok";
  add("health", "Core", "GET /v1/health", health.code === 200 && h.status === "ok" ? "ok" : "fail",
    health.code ? `${health.code} status=${h.status ?? "?"} version=${h.version ?? "?"}` : health.error ?? "no response", health.ms);
  add("db", "Core", "Database (via /v1/health)", dbOk ? "ok" : health.code ? "fail" : "off",
    dbOk ? "db: ok" : `db: ${h.db ?? "unknown"}`, health.ms);
  add("root", "Core", "GET / is refused", root.code === 403 ? "ok" : root.code === 404 ? "warn" : "fail",
    root.code === 404 ? "404 from nginx (docs say 403 ACCESS_DENIED)" : `${root.code} ${err(root)}`, root.ms);

  const l = obj(latest);
  add("schemes-latest", "Catalogue", "GET /v1/catalog/schemes/latest", latest.code === 200 ? "ok" : "fail",
    latest.code === 200 ? `release ${l.release_version ?? "none"} (${String(l.published_at ?? "").slice(0, 10)})` : `${latest.code} ${err(latest)}`, latest.ms);
  const cur = current.body as Record<string, unknown> | null;
  add("catalog-current", "Catalogue", "GET /v1/catalog/current", current.code !== 200 ? "fail" : cur ? "ok" : "warn",
    current.code !== 200 ? `${current.code} ${err(current)}` : cur ? `release ${cur.release_version}` : "no OTA catalogue release published (apps use the bundled catalogue)", current.ms);

  const lg = obj(legal);
  const items = (lg.items as Record<string, unknown>[] | undefined) ?? [];
  add("legal", "Catalogue", "GET /v1/legal-documents", legal.code === 200 && lg.configured === true ? "ok" : legal.code === 200 ? "warn" : "fail",
    `${legal.code} configured=${lg.configured} documents=${items.length}`, legal.ms);
  if (items[0]?.document_url) {
    const d = await call(`${API}${items[0].document_url as string}`);
    add("legal-doc", "Catalogue", `GET ${items[0].document_type} document`, d.code === 200 ? "ok" : "fail",
      `${d.code} ${String(obj(d).title ?? err(d))}`, d.ms);
  }

  const pe = obj(promoEn);
  const promoCount = Array.isArray(pe.items) ? pe.items.length : 0;
  add("promotions", "Catalogue", "GET /v1/promotions", promoEn.code !== 200 ? "fail" : promoCount ? "ok" : "warn",
    promoEn.code === 200 ? `${promoCount} promotion(s)` : `${promoEn.code} ${err(promoEn)}`, promoEn.ms);
  add("promotions-validate", "Validation", "Bad promotions language is rejected", promoBad.code === 400 ? "ok" : "fail",
    `${promoBad.code} ${err(promoBad)}`, promoBad.ms);

  for (const [id, name, r] of [
    ["guard-me", "GET /v1/me without login", me],
    ["guard-profile", "GET /v1/me/profile without login", profile],
    ["guard-schemes", "GET /v1/schemes without login", schemes],
    ["guard-admin", "GET /v1/admin/schemes/drafts without login", admin],
    ["guard-refresh", "POST /v1/auth/refresh with a fake token", refresh],
  ] as const) {
    add(id, "Access control", name, r.code === 401 ? "ok" : "fail", `${r.code} ${err(r)}`, r.ms);
  }
  add("not-found", "Validation", "Unknown route is a JSON 404", missing.code === 404 ? "ok" : "fail", `${missing.code} ${err(missing)}`, missing.ms);

  const loc = plain.headers?.get("location") ?? "";
  add("http-redirect", "Transport", "HTTP redirects to HTTPS",
    plain.code === 308 && loc.startsWith("https://") ? "ok" : [301, 302, 307].includes(plain.code) && loc.startsWith("https://") ? "warn" : plain.code === 0 ? "warn" : "fail",
    plain.code === 301 ? "301 (308 keeps POST bodies; see API_FIXES.md #4)" : `${plain.code} ${loc || plain.error || ""}`, plain.ms);
  const server = health.headers?.get("server") ?? "";
  const hsts = health.headers?.get("strict-transport-security") ?? "";
  add("hsts", "Transport", "HSTS header", hsts.includes("max-age") ? "ok" : "fail", hsts || "missing");
  add("server-header", "Transport", "Server version hidden (HTTPS)", /\d/.test(server) ? "warn" : "ok", server || "absent");
  add("old-host", "Transport", `Old host ${OLD_HOST} unused`, old.code === 200 ? "warn" : "ok",
    old.code === 200 ? "still answering 200; make sure nothing points at it" : `${old.code || "unreachable"} (expected, not used)`, old.ms);

  return { checks: c, version: typeof h.version === "string" ? h.version : undefined, dbOk };
}

/** Days until the TLS certificate of the API host expires. */
function certDays(host: string): Promise<{ days: number; issuer: string } | null> {
  return new Promise((resolve) => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: 8000 }, () => {
      const cert = s.getPeerCertificate();
      s.end();
      if (!cert?.valid_to) return resolve(null);
      const days = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000);
      resolve({ days, issuer: String(cert.issuer?.O ?? cert.issuer?.CN ?? "?") });
    });
    s.on("error", () => resolve(null));
    s.on("timeout", () => {
      s.destroy();
      resolve(null);
    });
  });
}

async function github(): Promise<GithubData> {
  const token = process.env.GITHUB_TOKEN;
  const base: GithubData = { connected: false, repo: REPO, releases: [], runs: [], issues: [], pulls: [] };
  if (!token) return { ...base, error: "GITHUB_TOKEN not set" };
  const gh = (path: string) =>
    call(`https://api.github.com/repos/${REPO}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
  const [rel, runs, issues, pulls] = await Promise.all([
    gh("/releases?per_page=6"),
    gh("/actions/runs?per_page=8"),
    gh("/issues?state=open&per_page=30"),
    gh("/pulls?state=open&per_page=20"),
  ]);
  if (rel.code !== 200) return { ...base, error: `GitHub ${rel.code}: ${err(rel) || (rel.body as Record<string, unknown>)?.message || ""}` };
  type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    connected: true,
    repo: REPO,
    releases: ((rel.body as J[]) ?? []).map((r) => {
      const apk = (r.assets as J[]).find((a) => String(a.name).endsWith(".apk"));
      return {
        tag: r.tag_name, name: r.name, published: r.published_at, prerelease: r.prerelease, url: r.html_url,
        apk: apk?.name, downloads: (r.assets as J[]).reduce((n, a) => n + (a.download_count ?? 0), 0),
      };
    }),
    runs: (((runs.body as J)?.workflow_runs as J[]) ?? []).map((w) => ({
      name: w.name, branch: w.head_branch, status: w.status, conclusion: w.conclusion, created: w.created_at, url: w.html_url,
    })),
    issues: ((issues.body as J[]) ?? []).filter((i) => !i.pull_request).map((i) => ({
      number: i.number, title: i.title, created: i.created_at, url: i.html_url,
    })),
    pulls: ((pulls.body as J[]) ?? []).map((p) => ({
      number: p.number, title: p.title, author: p.user?.login, created: p.created_at, url: p.html_url,
    })),
  };
}

let agentCache: { at: number; data: AgentData } | null = null;

/** Server agent data (host, PM2 services, database, user counts, error log), cached 20 s. */
export async function agent(): Promise<AgentData> {
  if (agentCache && Date.now() - agentCache.at < 20000) return agentCache.data;
  const data = await fetchAgent();
  agentCache = { at: Date.now(), data };
  return data;
}

async function fetchAgent(): Promise<AgentData> {
  const url = process.env.AGENT_URL;
  const token = process.env.AGENT_TOKEN;
  if (!url || !token) return { connected: false, error: "AGENT_URL / AGENT_TOKEN not set" };
  const r = await call(url, { headers: { Authorization: `Bearer ${token}` } }, 12000);
  if (r.code !== 200 || !r.body || typeof r.body !== "object") {
    return { connected: false, error: r.code ? `agent answered ${r.code} ${err(r)}` : `agent unreachable: ${r.error}` };
  }
  return { ...(r.body as AgentData), connected: true };
}

const fmtBytes = (n?: number) =>
  n == null ? "?" : n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(0)} MB` : `${Math.round(n / 1e3)} KB`;

let cache: { at: number; data: StatusPayload } | null = null;

export async function getStatus(force = false): Promise<StatusPayload> {
  if (!force && cache && Date.now() - cache.at < 30000) return cache.data;
  const [api, cert, gh, ag] = await Promise.all([apiChecks(), certDays(API_HOST), github(), agent()]);
  const checks = [...api.checks];
  checks.push({
    id: "tls", group: "Transport", name: "TLS certificate",
    level: cert == null ? "fail" : cert.days > 21 ? "ok" : cert.days > 7 ? "warn" : "fail",
    detail: cert ? `${cert.days} days left (${cert.issuer})` : "could not read certificate",
  });

  const failing = checks.filter((x) => x.level === "fail").length;
  const warning = checks.filter((x) => x.level === "warn").length;
  const latest = gh.releases[0];
  const ciLast = gh.runs.find((r) => r.status === "completed");
  const users = ag.users ?? {};
  const tiles: Tile[] = [
    { label: "API", value: failing ? `${failing} failing` : "Healthy", level: failing ? "fail" : warning ? "warn" : "ok",
      hint: `${checks.length - failing - warning}/${checks.length} checks OK${warning ? `, ${warning} warnings` : ""}` },
    { label: "Database", value: api.dbOk ? "Up" : "Down", level: api.dbOk ? "ok" : "fail",
      hint: ag.db?.sizeBytes != null ? `${fmtBytes(ag.db.sizeBytes)}, ${ag.db.connections ?? "?"} connections` : "from /v1/health" },
    { label: "Users", value: users.total != null ? String(users.total) : "—", level: users.total != null ? "ok" : "off",
      hint: !ag.connected ? "agent not connected" : users.total == null ? "database not readable by the agent"
        : `+${users.new_7d ?? "?"} this week` },
    { label: "Server errors (24 h)", value: ag.logs?.errors24h != null ? String(ag.logs.errors24h) : "—",
      level: ag.logs?.errors24h == null ? "off" : ag.logs.errors24h > 0 ? "warn" : "ok",
      hint: !ag.connected ? "agent not connected" : ag.logs?.error ? "logs unavailable" : ag.service?.name ?? "" },
    { label: "Latest app", value: latest ? latest.tag.replace(/^app-v/, "") : "—", level: gh.connected ? "ok" : "off",
      hint: latest ? `${latest.downloads} APK downloads` : gh.error ?? "" },
    { label: "CI", value: ciLast ? (ciLast.conclusion ?? "?") : "—",
      level: !gh.connected ? "off" : ciLast?.conclusion === "success" ? "ok" : ciLast ? "warn" : "off", hint: ciLast?.name ?? "" },
    { label: "Open issues", value: gh.connected ? String(gh.issues.length) : "—", level: !gh.connected ? "off" : gh.issues.length ? "warn" : "ok",
      hint: gh.connected ? `${gh.pulls.length} open PRs` : "" },
  ];

  const data: StatusPayload = {
    generatedAt: new Date().toISOString(), apiBase: API, apiVersion: api.version, tiles, checks, github: gh, agent: ag,
  };
  cache = { at: Date.now(), data };
  return data;
}
