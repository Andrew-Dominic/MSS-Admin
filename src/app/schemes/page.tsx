import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { describeError } from "@/lib/mss/api";
import { listAllDrafts } from "@/lib/mss/schemes";
import { draftName, type Draft } from "@/lib/mss/types";
import { Notice, PageHeader, btn } from "@/components/admin/ui";
import { SchemesTable, type SchemeRow } from "@/components/schemes/SchemesTable";

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

export default async function SchemesPage() {
  let rows: SchemeRow[] = [];
  let error: string | null = null;
  try {
    rows = latestPerScheme(await listAllDrafts());
  } catch (e) {
    error = describeError(e);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Schemes"
        description="Every scheme that has gone through the draft → approve → publish workflow on the MSS server."
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
      {error ? <Notice tone="error">Could not load schemes: {error}</Notice> : <SchemesTable rows={rows} />}
    </div>
  );
}
