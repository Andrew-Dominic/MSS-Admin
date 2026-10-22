import Link from "next/link";
import { ArrowUpRight, Bell, CheckCircle2, Clock3, FileText, Layers, Rocket, Upload, Users, XCircle } from "lucide-react";
import { describeError } from "@/lib/mss/api";
import { MSS_API_BASE } from "@/lib/mss/config";
import { catalogSummary } from "@/lib/mss/catalog";
import { apiHealth, broadcastsSupported, latestRelease, listAllDrafts } from "@/lib/mss/schemes";
import { agent } from "@/lib/status/checks";
import { COLLECTIONS, collectionForId, draftName, type Draft } from "@/lib/mss/types";
import { Notice, StatusBadge, btn, formatDate } from "@/components/admin/ui";
import { Bars } from "@/components/dashboard/Bars";
import { CountUp } from "@/components/dashboard/CountUp";

export const dynamic = "force-dynamic";

const IST = "Asia/Kolkata";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: IST }); // YYYY-MM-DD

/** Count of draft activity (creations and updates) per day for the last [days] days, oldest first. */
function activityByDay(drafts: Draft[], days: number) {
  const counts = new Map<string, number>();
  for (const d of drafts) {
    for (const iso of new Set([d.created_at, d.updated_at])) {
      if (!iso) continue;
      const k = dayKey(new Date(iso));
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const out: { label: string; value: number; title: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86_400_000);
    out.push({
      label: day.toLocaleDateString("en-IN", { day: "numeric", timeZone: IST }),
      title: day.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST }),
      value: counts.get(dayKey(day)) ?? 0,
    });
  }
  return out;
}

function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <section className={`mss-fade-up rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  const [health, release, notifyOn, catalog, server] = await Promise.all([
    apiHealth(),
    latestRelease().catch(() => null),
    broadcastsSupported(),
    catalogSummary(),
    agent(),
  ]);
  let drafts: Draft[] = [];
  let error: string | null = null;
  try {
    drafts = await listAllDrafts();
  } catch (e) {
    error = describeError(e);
  }

  const count = (s: string) => drafts.filter((d) => d.status === s).length;
  const publishedIds = new Set(drafts.filter((d) => d.status === "published" && d.action === "upsert").map((d) => d.scheme_id));
  const published = publishedIds.size;
  const toReview = count("draft");
  const approved = count("approved");
  const recent = [...drafts].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")).slice(0, 7);
  const activity = activityByDay(drafts, 14);
  const week = activity.slice(-7);
  const apiUp = health?.status === "ok";

  // Live app catalogue (all published schemes), falling back to the workflow count.
  const liveSchemes = catalog?.schemes ?? published;
  const byCollection = COLLECTIONS.map((c) => ({
    ...c,
    n: catalog ? catalog.byCollection[c.value] : [...publishedIds].filter((id) => collectionForId(id) === c.value).length,
  }));
  const STATUS_TONE: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    announced: "bg-blue-100 text-blue-800",
    unknown: "bg-slate-200 text-slate-700",
    closed: "bg-red-100 text-red-700",
  };
  const users = server.connected ? server.users : undefined;
  const maxCollection = Math.max(1, ...byCollection.map((c) => c.n));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="mss-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">MSME Schemes Search</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Changes reach the app after they are approved and published.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/schemes/upload" className={btn.secondary}>
            <Upload className="h-4 w-4" /> Upload dataset
          </Link>
          <Link href="/schemes/new" className={`${btn.primary} rounded-full bg-[var(--mss-navy)] hover:bg-blue-800`}>
            <FileText className="h-4 w-4" /> New scheme
          </Link>
        </div>
      </div>

      {error && <Notice tone="error">Could not load drafts: {error}</Notice>}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="mss-fade-up relative overflow-hidden rounded-3xl bg-[radial-gradient(120%_120%_at_0%_0%,#0b3a75_0%,var(--mss-navy)_55%,var(--mss-navy-deep)_100%)] p-5 text-white shadow-lg shadow-blue-950/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-blue-100/70">Schemes in the app</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight"><CountUp value={liveSchemes} /></p>
              <p className="mt-1 text-xs text-blue-100/60">{catalog ? `live catalogue · ${catalog.release.release_version}` : "via the review workflow"}</p>
            </div>
            <div className="w-24 shrink-0">
              <Bars data={week} height={56} tone="dark" showLabels={false} />
            </div>
          </div>
          <div aria-hidden className="mss-float pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl" />
        </section>

        <Link href="/status" className="mss-fade-up group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">App users</p>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-900">
            {users?.total != null ? <CountUp value={users.total} /> : "—"}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            {users?.total != null ? `+${users.new_7d ?? 0} this week · ${users.active_sessions ?? "?"} signed in` : "connect the server agent"}
            <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
          </p>
        </Link>

        <Link href="/releases" className="mss-fade-up group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Drafts to review</p>
            <Clock3 className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-900"><CountUp value={toReview} /></p>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <CheckCircle2 className="h-3 w-3 text-blue-600" /> {approved} approved, ready to publish
            <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
          </p>
        </Link>

        <Card delay={180}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Live release</p>
            <Rocket className="h-4 w-4 text-[var(--mss-green)]" />
          </div>
          <p
            title={release?.release_version}
            className={`mt-1 truncate font-semibold tracking-tight text-slate-900 ${(release?.release_version.length ?? 0) > 6 ? "text-2xl leading-10" : "text-4xl"}`}
          >
            {release?.release_version ?? "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">{release ? formatDate(release.published_at) : "none yet"}</p>
        </Card>
      </div>

      {/* Activity + breakdown */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card delay={220}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Review activity</h2>
              <p className="text-xs text-slate-500">Scheme drafts created or updated per day</p>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">14 days</span>
          </div>
          <Bars data={activity} height={180} />
        </Card>

        <section className="mss-fade-up rounded-3xl bg-gradient-to-br from-blue-50 to-sky-100/60 p-5 ring-1 ring-blue-100" style={{ animationDelay: "260ms" }}>
          <div className="flex items-center gap-2 text-blue-900">
            <Layers className="h-4 w-4" />
            <h2 className="text-base font-semibold">By collection</h2>
          </div>
          <p className="mt-3 text-5xl font-semibold tracking-tight text-[var(--mss-navy)]">
            <CountUp value={liveSchemes} />
            <span className="ml-2 text-base font-medium text-blue-700/70">schemes live</span>
          </p>
          {catalog && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(catalog.byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([st, n]) => (
                  <span key={st} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_TONE[st] ?? STATUS_TONE.unknown}`}>
                    {n} {st}
                  </span>
                ))}
            </div>
          )}
          <ul className="mt-5 space-y-4">
            {byCollection.map((c, i) => (
              <li key={c.value}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{c.label}</span>
                  <span className="font-semibold text-slate-900">{c.n}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="mss-grow-x h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700"
                    style={{ width: `${(c.n / maxCollection) * 100}%`, animationDelay: `${300 + i * 80}ms` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recent + system */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card delay={300} className="overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-base font-semibold text-slate-900">Recent changes</h2>
            <Link href="/schemes" className="text-sm font-semibold text-blue-700 hover:underline">All schemes</Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No drafts yet. Start by uploading the 2026 datasets.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="px-5 py-2 font-medium">Scheme</th>
                    <th className="px-3 py-2 font-medium">Collection</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((d) => (
                    <tr key={d.id} className="transition-colors hover:bg-blue-50/40">
                      <td className="max-w-[280px] px-5 py-3">
                        <Link href={`/schemes/${d.id}`} className="block truncate font-medium text-slate-900 hover:text-blue-700">{draftName(d)}</Link>
                        <span className="font-mono text-xs text-slate-400">{d.scheme_id}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{COLLECTIONS.find((c) => c.value === collectionForId(d.scheme_id))?.label ?? "—"}</td>
                      <td className="px-3 py-3"><StatusBadge status={d.status} action={d.action} /></td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-xs text-slate-500">{formatDate(d.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <section className="mss-fade-up flex flex-col gap-4 rounded-3xl bg-[var(--mss-navy-deep)] p-5 text-white shadow-lg shadow-blue-950/20" style={{ animationDelay: "340ms" }}>
          <h2 className="text-base font-semibold">System</h2>
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
            {apiUp ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold">MSS API {apiUp ? "online" : "unreachable"}</p>
              <p className="truncate text-xs text-blue-100/60">
                {MSS_API_BASE.replace("https://", "")}
                {health && ` · db ${health.db} · v${health.version}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
            <Bell className={`h-5 w-5 ${notifyOn ? "text-emerald-400" : "text-amber-400"}`} />
            <div>
              <p className="text-sm font-semibold">Notifications {notifyOn ? "ready" : "unavailable"}</p>
              <p className="text-xs text-blue-100/60">{notifyOn ? "Broadcasts and Notify users on publish" : "Server update needed for broadcasts"}</p>
            </div>
          </div>
          <Link href="/notifications" className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--mss-navy)] transition hover:bg-blue-50">
            <Bell className="h-4 w-4" /> Send a notification
          </Link>
        </section>
      </div>
    </div>
  );
}
