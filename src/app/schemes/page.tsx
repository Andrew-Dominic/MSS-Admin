import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { describeError } from "@/lib/mss/api";
import { listAllDrafts } from "@/lib/mss/schemes";
import { catalogSummary } from "@/lib/mss/catalog";
import { draftName, type Draft } from "@/lib/mss/types";
import { Notice, PageHeader, btn } from "@/components/admin/ui";
import { SchemesTable, type SchemeRow } from "@/components/schemes/SchemesTable";
import { CatalogTable, type CatalogRow } from "@/components/schemes/CatalogTable";

export const dynamic = "force-dynamic";

/** Prefer the open revision (draft/approved) over published/discarded ones. */
const RANK: Record<string, number> = { draft: 3, approved: 3, published: 2, discarded: 1 };

function latestPerScheme(drafts: Draft[]): SchemeRow[] {
  const byScheme = new Map<string, Draft[]>();
  for (const d of drafts) byScheme.set(d.scheme_id, [...(byScheme.get(d.scheme_id) ?? []), d]);
  const rows: SchemeRow[] = [];
  for (const [schemeId, list] of byScheme) {
    list.sort((a, b) => (RANK[b.status] ?? 0) - (RANK[a.status] ?? 0) || (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    const top = list[0];
    const published = list.find((d) => d.status === "published" && d.action === "upsert");
    rows.push({
      draftId: top.id,
      schemeId,
      name: draftName(top),
      collection: top.payload?.collection ?? null,
      state: top.payload?.source_state ?? null,
      status: top.status,
      action: top.action,
      version: top.version,
      updatedAt: top.updated_at ?? null,
      isPublished: Boolean(published),
    });
  }
  return rows.sort((a, b) => a.schemeId.localeCompare(b.schemeId));
}

export default async function SchemesPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const { view: v } = await searchParams;
  const view = v === "drafts" ? "drafts" : "live";
  let drafts: Draft[] = [];
  let error: string | null = null;
  try {
    drafts = await listAllDrafts();
  } catch (e) {
    error = describeError(e);
  }
  const rows: SchemeRow[] = latestPerScheme(drafts);

  let catalog: CatalogRow[] | null = null;
  let release: string | null = null;
  if (view === "live") {
    const summary = await catalogSummary();
    if (summary) {
      release = summary.release.release_version;
      const open = new Map<string, Draft>();
      for (const d of drafts) if (d.status === "draft" || d.status === "approved") open.set(d.scheme_id, d);
      // Only light fields go to the browser, not the full source records.
      catalog = summary.items.map((s) => {
        const d = open.get(s.id);
        return {
          id: s.id,
          name: s.name,
          nameHi: s.nameHi,
          nameTa: s.nameTa,
          collection: s.collection,
          status: s.status,
          level: s.level,
          state: s.state,
          openDraft: d ? { id: d.id, status: d.status } : undefined,
        };
      });
    }
  }

  const tab = (href: string, label: string, on: boolean, count?: number) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${on ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
    >
      {label}{count != null ? ` (${count})` : ""}
    </Link>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Schemes"
        description={
          view === "live"
            ? `Every scheme live in the MSS app${release ? ` (release ${release})` : ""}. Edit one to create a draft, then approve, publish and notify users.`
            : "Every scheme that has gone through the draft → approve → publish workflow on the MSS server."
        }
        actions={
          <>
            <Link href="/schemes/upload" className={btn.secondary}>
              <Upload className="h-4 w-4" /> Upload dataset
            </Link>
            <Link href="/schemes/new" className={btn.primary}>
              <Plus className="h-4 w-4" /> New scheme
            </Link>
          </>
        }
      />
      <nav aria-label="Scheme views" className="mss-fade-up mb-4 inline-flex gap-1 rounded-full bg-slate-100 p-1">
        {tab("/schemes", "Live in app", view === "live", catalog?.length)}
        {tab("/schemes?view=drafts", "Drafts & history", view === "drafts", error ? undefined : rows.length)}
      </nav>
      {view === "live" ? (
        catalog ? (
          <div className="space-y-4">
            {error && <Notice tone="warn">Open drafts could not be loaded: {error}</Notice>}
            <CatalogTable rows={catalog} />
          </div>
        ) : (
          <Notice tone="error">The live catalogue could not be loaded from the MSS API. Try again in a minute, or use the drafts view.</Notice>
        )
      ) : error ? (
        <Notice tone="error">Could not load schemes: {error}</Notice>
      ) : (
        <SchemesTable rows={rows} />
      )}
    </div>
  );
}
