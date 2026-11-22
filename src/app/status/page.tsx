import { Activity, AlertTriangle, Boxes, Cpu, Database, GitPullRequest, HardDrive, Server, Smartphone, Users } from "lucide-react";
import { getStatus } from "@/lib/status/checks";
import type { Level } from "@/lib/status/types";
import { formatDate } from "@/components/admin/ui";
import { AutoRefresh } from "@/components/status/AutoRefresh";

export const dynamic = "force-dynamic";

const DOT: Record<Level, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  fail: "bg-red-500",
  off: "bg-slate-300",
};
const RING: Record<Level, string> = {
  ok: "ring-emerald-100",
  warn: "ring-amber-100",
  fail: "ring-red-100",
  off: "ring-slate-200/70",
};

const bytes = (n?: number) =>
  n == null ? "—" : n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(0)} MB` : `${Math.round(n / 1e3)} KB`;
const duration = (sec: number) => {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  return d ? `${d}d ${h}h` : `${h}h ${Math.floor((sec % 3600) / 60)}m`;
};
const since = (iso?: string) => (iso ? duration(Math.max(0, (Date.now() - Date.parse(iso)) / 1000)) : "—");

function Section({ title, icon: Icon, children, delay = 0, className = "" }: { title: string; icon: typeof Server; children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <section className={`mss-fade-up rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-blue-600" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-medium text-slate-900">{v}</span>
    </div>
  );
}

function Off({ text }: { text: string }) {
  return <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">{text}</p>;
}

const USER_LABELS: Record<string, string> = {
  total: "Total users",
  new_24h: "New today",
  new_7d: "New this week",
  new_30d: "New in 30 days",
  profiles_complete: "Completed profiles",
  active_sessions: "Signed-in sessions",
  push_devices: "Phones registered for push",
  favorites: "Saved schemes",
  support_tickets_7d: "Support tickets (7 days)",
  admins: "Admins",
};

export default async function StatusPage() {
  const s = await getStatus();
  const ag = s.agent;
  const groups = [...new Set(s.checks.map((c) => c.group))];
  const memUsed = ag.host ? ag.host.memTotal - ag.host.memFree : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="mss-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">MSS Status</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">System</h1>
          <p className="mt-1 text-sm text-slate-500">
            API, server, database, users and the app, checked live. {s.apiVersion && `API v${s.apiVersion}.`}
          </p>
        </div>
        <AutoRefresh generatedAt={s.generatedAt} />
      </div>

      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {s.tiles.map((t, i) => (
          <div key={t.label} className={`mss-fade-up rounded-3xl bg-white p-4 shadow-sm ring-1 ${RING[t.level]}`} style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className={`h-2 w-2 rounded-full ${DOT[t.level]}`} aria-hidden />
              {t.label}
            </div>
            <p className="mt-1 truncate text-xl font-semibold text-slate-900" title={t.value}>{t.value}</p>
            {t.hint && <p className="truncate text-xs text-slate-400" title={t.hint}>{t.hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Server */}
        <Section title="Server" icon={Server} delay={100}>
          {!ag.connected ? (
            <Off text={`Agent not connected: ${ag.error ?? "unknown"}.`} />
          ) : (
            <>
              <Row k="Host" v={ag.host?.hostname} />
              <Row k="Uptime" v={ag.host ? duration(ag.host.uptimeSec) : "—"} />
              <Row k="Load (1 / 5 / 15 min)" v={ag.host?.load.map((l) => l.toFixed(2)).join(" / ")} />
              <Row k="Memory" v={`${bytes(memUsed)} of ${bytes(ag.host?.memTotal)}`} />
              <Row k="Disk" v={ag.host?.disk ? `${bytes(ag.host.disk.used)} of ${bytes(ag.host.disk.total)}` : "—"} />
              {ag.host?.disk && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="mss-grow-x h-full rounded-full bg-blue-600" style={{ width: `${(ag.host.disk.used / ag.host.disk.total) * 100}%` }} />
                </div>
              )}
            </>
          )}
        </Section>

        {/* Services */}
        <Section title="Services" icon={Cpu} delay={140}>
          {!ag.connected ? (
            <Off text="Needs the server agent." />
          ) : (
            <ul className="space-y-2">
              {(ag.services ?? (ag.service ? [{ ...ag.service, memory: undefined as number | undefined }] : [])).map((svc) => (
                <li key={svc.name} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${svc.active === "active" ? "bg-emerald-500" : "bg-red-500"}`} aria-hidden />
                    <span className="text-sm font-medium text-slate-900">{svc.name}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {svc.active === "active" ? `up ${since(svc.since)}` : svc.active}
                    {svc.restarts ? ` · ${svc.restarts} restarts` : ""}
                    {svc.memory ? ` · ${bytes(svc.memory)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Database */}
        <Section title="Database" icon={Database} delay={180}>
          {!ag.connected || !ag.db?.ok ? (
            <Off text={ag.connected ? `Not readable: ${ag.db?.error ?? "unknown"}` : "Needs the server agent."} />
          ) : (
            <>
              <Row k="PostgreSQL" v={ag.db.version?.replace("PostgreSQL ", "")} />
              <Row k="Size" v={bytes(ag.db.sizeBytes)} />
              <Row k="Connections" v={ag.db.connections} />
              <Row k="Up since" v={formatDate(ag.db.startedAt)} />
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-blue-700">Largest tables</summary>
                <ul className="mt-2 space-y-1 text-xs">
                  {ag.db.tables?.slice(0, 12).map((t) => (
                    <li key={t.name} className="flex justify-between text-slate-600">
                      <span className="font-mono">{t.name}</span>
                      <span>{t.rows.toLocaleString("en-IN")}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Users */}
        <Section title="Users" icon={Users} delay={220}>
          {!ag.connected || !ag.users || ag.users.total == null ? (
            <Off text="Needs the server agent with database access." />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(USER_LABELS)
                .filter(([k]) => ag.users?.[k] != null)
                .map(([k, label]) => (
                  <div key={k} className={`rounded-2xl p-3 ${k === "total" ? "col-span-2 bg-[var(--mss-navy)] text-white" : "bg-slate-50"}`}>
                    <p className={`text-xs ${k === "total" ? "text-blue-100/70" : "text-slate-500"}`}>{label}</p>
                    <p className="text-2xl font-semibold">{ag.users?.[k]?.toLocaleString("en-IN")}</p>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* Errors */}
        <Section title="Server errors and warnings" icon={AlertTriangle} delay={260}>
          {!ag.connected ? (
            <Off text="Needs the server agent." />
          ) : ag.logs?.error ? (
            <Off text={`Logs unavailable: ${ag.logs.error}`} />
          ) : !ag.logs?.lines.length ? (
            <Off text="No errors or warnings in the recent log. 🎉" />
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-500">
                {ag.logs.errors24h != null && `${ag.logs.errors24h} errors in the last 24 h · `}source: {ag.logs.source}
              </p>
              <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                {ag.logs.lines.slice(0, 60).map((l, i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-slate-50 px-3 py-2 font-mono text-[11px] leading-relaxed">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${l.level === "error" ? "bg-red-500" : "bg-amber-500"}`} aria-hidden />
                    <span className="shrink-0 text-slate-400">{l.time.slice(5, 16)}</span>
                    <span className="break-all text-slate-700">{l.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      </div>

      {/* API checks */}
      <Section title={`API checks (${s.checks.filter((c) => c.level === "ok").length}/${s.checks.length} OK)`} icon={Activity} delay={300}>
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{g}</p>
              <ul className="space-y-1">
                {s.checks
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <li key={c.id} className="flex items-start gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[c.level]}`} aria-label={c.level} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800">{c.name}</span>
                        <span className="block break-words text-xs text-slate-500">{c.detail}</span>
                      </span>
                      {c.ms != null && <span className="shrink-0 text-xs text-slate-400">{c.ms} ms</span>}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* App (GitHub) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="App releases" icon={Smartphone} delay={340}>
          {!s.github.connected ? (
            <Off text={`GitHub not connected: ${s.github.error ?? "unknown"}.`} />
          ) : (
            <ul className="space-y-2">
              {s.github.releases.map((r) => (
                <li key={r.tag}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 hover:bg-blue-50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{r.tag.replace(/^app-v/, "")}</span>
                      <span className="block text-xs text-slate-500">{formatDate(r.published)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{r.downloads} downloads</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Builds (CI)" icon={Boxes} delay={380}>
          {!s.github.connected ? (
            <Off text="Needs a GitHub token." />
          ) : (
            <ul className="space-y-2">
              {s.github.runs.map((r, i) => (
                <li key={i}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 hover:bg-blue-50">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${r.conclusion === "success" ? "bg-emerald-500" : r.status !== "completed" ? "bg-blue-500" : "bg-red-500"}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{r.name}</span>
                      <span className="block truncate text-xs text-slate-500">{r.branch} · {formatDate(r.created)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{r.conclusion ?? r.status}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Open issues and PRs" icon={GitPullRequest} delay={420}>
          {!s.github.connected ? (
            <Off text="Needs a GitHub token." />
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {[...s.github.pulls.map((p) => ({ ...p, kind: "PR" })), ...s.github.issues.map((p) => ({ ...p, kind: "Issue" }))].map((x) => (
                <li key={`${x.kind}${x.number}`}>
                  <a href={x.url} target="_blank" rel="noreferrer" className="block rounded-2xl bg-slate-50 px-3 py-2.5 hover:bg-blue-50">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${x.kind === "PR" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{x.kind}</span>
                      #{x.number} {x.title}
                    </span>
                    <span className="block text-xs text-slate-500">{formatDate(x.created)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <HardDrive className="h-3.5 w-3.5" /> Read-only: these checks never change data. Agent data is aggregate counts only, no personal details.
      </p>
    </div>
  );
}
