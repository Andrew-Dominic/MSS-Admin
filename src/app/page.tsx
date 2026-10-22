import Link from "next/link";
import { CheckCircle2, FileText, Rocket, Upload, XCircle } from "lucide-react";
import { describeError } from "@/lib/mss/api";
import { MSS_API_BASE } from "@/lib/mss/config";
import { apiHealth, latestRelease, listAllDrafts } from "@/lib/mss/schemes";
import { draftName, type Draft } from "@/lib/mss/types";
import { Notice, PageHeader, Panel, StatusBadge, btn, formatDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [health, release] = await Promise.all([apiHealth(), latestRelease().catch(() => null)]);
  let drafts: Draft[] = [];
  let error: string | null = null;
  try {
    drafts = await listAllDrafts();
  } catch (e) {
    error = describeError(e);
  }

  const count = (s: string) => drafts.filter((d) => d.status === s).length;
  const publishedSchemes = new Set(drafts.filter((d) => d.status === "published" && d.action === "upsert").map((d) => d.scheme_id)).size;
  const recent = [...drafts].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")).slice(0, 8);
  const apiUp = health?.status === "ok";

  const tiles = [
    { label: "Published schemes", value: publishedSchemes, hint: "via this workflow" },
    { label: "Drafts to review", value: count("draft"), hint: "need approval", href: "/releases" },
    { label: "Approved, not live", value: count("approved"), hint: "ready to publish", href: "/releases" },
    { label: "Live release", value: release?.release_version ?? "—", hint: release ? formatDate(release.published_at) : "none yet" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="MSS schemes on the MSS server. Changes reach the app after they are approved and published."
        actions={
          <>
            <Link href="/schemes/upload" className={btn.secondary}><Upload className="h-4 w-4" /> Upload dataset</Link>
            <Link href="/schemes/new" className={btn.primary}><FileText className="h-4 w-4" /> New scheme</Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
        {apiUp ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
        <span className="font-semibold text-gray-900">MSS API {apiUp ? "online" : "unreachable"}</span>
        <span className="text-gray-500">{MSS_API_BASE.replace("https://", "")}</span>
        {health && <span className="text-gray-500">· database {health.db} · v{health.version}</span>}
      </div>

      {error && <Notice tone="error">Could not load drafts: {error}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.label}</div>
              <div className="mt-1 text-3xl font-bold text-gray-900">{t.value}</div>
              <div className="text-xs text-gray-400">{t.hint}</div>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-orange-300">{body}</Link>
          ) : (
            <div key={t.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">{body}</div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title="Recent changes" actions={<Link href="/schemes" className="text-sm font-semibold text-orange-600 hover:underline">All schemes</Link>}>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">No drafts yet. Start by uploading the 2026 datasets.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/schemes/${d.id}`} className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900 hover:text-orange-600">{draftName(d)}</span>
                    <span className="font-mono text-xs text-gray-400">{d.scheme_id} · {formatDate(d.updated_at)}</span>
                  </Link>
                  <StatusBadge status={d.status} action={d.action} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="How publishing works">
          <ol className="space-y-3 text-sm text-gray-600">
            <li><span className="font-semibold text-gray-900">1. Draft</span> — create or edit a scheme, or upload a dataset.</li>
            <li><span className="font-semibold text-gray-900">2. Approve</span> — review each draft and approve it with a note.</li>
            <li><span className="font-semibold text-gray-900">3. Publish</span> — publish approved drafts as a new release. <Link href="/releases" className="font-semibold text-orange-600 hover:underline"><Rocket className="inline h-3.5 w-3.5" /> Releases</Link></li>
          </ol>
        </Panel>
      </div>
    </div>
  );
}
