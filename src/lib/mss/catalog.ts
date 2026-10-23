import "server-only";
import { gunzipSync } from "node:zlib";
import { apiUrl } from "./config";
import { collectionForId, type Collection, type SchemeRecord } from "./types";

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

let cache: { tag: string; summary: CatalogSummary } | null = null;

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
  cache = { tag: release.release_version, summary };
  return summary;
}

/** One live scheme by id (for editing and change summaries). */
export async function catalogScheme(id: string): Promise<CatalogScheme | null> {
  const summary = await catalogSummary();
  return summary?.items.find((s) => s.id === id) ?? null;
}
