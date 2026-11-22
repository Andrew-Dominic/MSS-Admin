import "server-only";
import { gunzipSync } from "node:zlib";
import { apiUrl } from "./config";
import { recordFromBundle } from "./fromBundle";
import { listAllDrafts } from "./schemes";
import { collectionForId, type Collection, type Draft, type SchemeRecord } from "./types";

/** GET /v1/catalog/current: the published app catalogue (public). */
export interface CatalogCurrent {
  release_version: string;
  schema_version: number;
  package_sha256: string;
  package_byte_size: number;
  record_counts: Record<string, number>;
  published_at: string;
  bundle_url: string;
}

/** One scheme as the app has it, plus its original (editable) source record. */
export interface CatalogScheme {
  id: string;
  name: string;
  nameHi?: string;
  nameTa?: string;
  collection: Collection | null;
  status: string;
  level?: string;
  state?: string;
  category?: string;
  source: SchemeRecord | null;
  /**
   * Where `source` came from: the bundle itself, the scheme's latest published
   * draft (exact), or rebuilt from the app catalogue (close, see fromBundle.ts).
   */
  sourceFrom?: "bundle" | "draft" | "catalogue";
}

export interface CatalogSummary {
  release: CatalogCurrent;
  schemes: number;
  byCollection: Record<Collection, number>;
  byStatus: Record<string, number>;
  /** Schemes with a Hindi / Tamil name in the bundle. */
  localized: { hi: number; ta: number };
  /** Non-scheme catalogues (authorities, institutions, ...) and their sizes. */
  others: { name: string; count: number }[];
  /** Every scheme in the live catalogue, sorted by id. */
  items: CatalogScheme[];
}

let cache: { tag: string; summary: CatalogSummary; projections: Map<string, unknown> } | null = null;

export async function catalogCurrent(): Promise<CatalogCurrent | null> {
  try {
    const res = await fetch(apiUrl("/catalog/current"), { next: { revalidate: 60 }, signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as CatalogCurrent | null) : null;
  } catch {
    return null;
  }
}

const label = (file: string) =>
  file
    .replace(/_catalog\.json$/, "")
    .replace(/\.json$/, "")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

/**
 * Summary of the live catalogue the app downloads: totals per collection and
 * status. The bundle is immutable per release tag, so it is fetched once per
 * release and kept in memory.
 */
export async function catalogSummary(): Promise<CatalogSummary | null> {
  const release = await catalogCurrent();
  if (!release) return null;
  if (cache?.tag === release.release_version) return cache.summary;

  const byCollection: Record<Collection, number> = { central: 0, tamil_nadu: 0, maharashtra: 0 };
  const byStatus: Record<string, number> = {};
  const localized = { hi: 0, ta: 0 };
  const list: CatalogScheme[] = [];
  const projections = new Map<string, unknown>();
  let schemes = release.record_counts["scheme_catalog.json"] ?? 0;

  try {
    const res = await fetch(apiUrl(release.bundle_url.replace(/^\/v1/, "")), { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (res.ok) {
      const raw = Buffer.from(await res.arrayBuffer());
      const text = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
      const bundle = JSON.parse(text) as Record<string, { data?: unknown[] } | unknown[]>;
      const sc = bundle["scheme_catalog.json"];
      const items = (Array.isArray(sc) ? sc : sc?.data ?? []) as {
        identity?: { id?: string; status?: string; name?: string };
        localization?: Record<string, { name?: string }>;
        source?: SchemeRecord;
      }[];
      schemes = items.length;
      for (const s of items) {
        const c = collectionForId(s.identity?.id ?? "");
        if (c) byCollection[c]++;
        const st = s.identity?.status ?? "unknown";
        byStatus[st] = (byStatus[st] ?? 0) + 1;
        if (s.localization?.hi?.name) localized.hi++;
        if (s.localization?.ta?.name) localized.ta++;
        const id = s.identity?.id ?? "";
        const src = s.source ?? null;
        projections.set(id, s);
        list.push({
          id,
          name: s.identity?.name || (src?.name?.en ?? "") || id,
          nameHi: s.localization?.hi?.name,
          nameTa: s.localization?.ta?.name,
          collection: c,
          status: st,
          level: src?.level,
          state: src?.state,
          category: typeof src?.category === "string" ? src.category : undefined,
          source: src,
          sourceFrom: src ? "bundle" : undefined,
        });
      }
    }
  } catch {
    // Fall back to the counts in the release metadata.
  }

  const others = Object.entries(release.record_counts)
    .filter(([f]) => f !== "scheme_catalog.json" && f !== "applicability_matrix_catalog.json")
    .map(([f, count]) => ({ name: label(f), count }))
    .sort((a, b) => b.count - a.count);

  list.sort((a, b) => a.id.localeCompare(b.id));
  const summary: CatalogSummary = { release, schemes, byCollection, byStatus, localized, others, items: list };
  cache = { tag: release.release_version, summary, projections };
  return summary;
}

/** The record of the scheme's most recent published draft: exactly what went live. */
function publishedDraftRecord(drafts: Draft[], id: string): SchemeRecord | null {
  const published = drafts
    .filter((d) => d.scheme_id === id && d.status === "published" && d.action === "upsert" && d.payload?.raw)
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "") || b.version - a.version);
  return published[0]?.payload?.raw ?? null;
}

/**
 * One live scheme by id, with its editable record (for editing and change
 * summaries). The bundle has carried no `source` records since the unified
 * release workflow, so the record comes from the latest published draft or,
 * for schemes that never had a draft, is rebuilt from the app catalogue.
 * Pass the drafts if the caller already listed them (the list is rate limited).
 */
export async function catalogScheme(id: string, drafts?: Draft[]): Promise<CatalogScheme | null> {
  const summary = await catalogSummary();
  const item = summary?.items.find((s) => s.id === id) ?? null;
  if (!item || item.source) return item;
  const all = drafts ?? (await listAllDrafts().catch(() => []));
  const fromDraft = publishedDraftRecord(all, id);
  const source = fromDraft ?? recordFromBundle(cache?.projections.get(id));
  if (!source) return item;
  return {
    ...item,
    level: item.level ?? source.level,
    state: item.state ?? source.state,
    category: item.category ?? (typeof source.category === "string" ? source.category : undefined),
    source,
    sourceFrom: fromDraft ? "draft" : "catalogue",
  };
}
