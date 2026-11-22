"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { COLLECTIONS, type Collection } from "@/lib/mss/types";
import { btn, field } from "@/components/admin/ui";

/** A live scheme, with only what the list needs. */
export interface CatalogRow {
  id: string;
  name: string;
  nameHi?: string;
  nameTa?: string;
  collection: Collection | null;
  status: string;
  level?: string;
  state?: string;
  /** Open (draft/approved) revision of this scheme, if any. */
  openDraft?: { id: string; status: string };
}

const PAGE = 25;

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  announced: "bg-blue-50 text-blue-700 ring-blue-200",
  closed: "bg-gray-100 text-gray-500 ring-gray-200",
};

export function CatalogTable({ rows }: { rows: CatalogRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [collection, setCollection] = useState<"all" | Collection>("all");
  const [page, setPage] = useState(0);

  const statuses = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (collection === "all" || r.collection === collection) &&
        (!needle ||
          r.id.toLowerCase().includes(needle) ||
          r.name.toLowerCase().includes(needle) ||
          (r.nameHi ?? "").toLowerCase().includes(needle) ||
          (r.nameTa ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, q, status, collection]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <div className="space-y-4">
      <div className="mss-fade-up grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 md:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <span className="sr-only">Search live schemes</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search by ID or name (English, हिन्दी, தமிழ்)"
            className={`${field} pl-9`}
          />
        </label>
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={field}>
          <option value="all">All statuses ({rows.length})</option>
          {statuses.map(([s, n]) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)} ({n})</option>)}
        </select>
        <select aria-label="Collection" value={collection} onChange={(e) => { setCollection(e.target.value as typeof collection); setPage(0); }} className={field}>
          <option value="all">All collections</option>
          {COLLECTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="mss-fade-up overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Scheme</th>
              <th className="px-4 py-3">Collection</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Level / state</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50/30">
                <td className="px-4 py-3">
                  <Link href={`/schemes/catalog/${r.id}`} className="font-semibold text-slate-900 hover:text-blue-700">{r.name}</Link>
                  <div className="font-mono text-xs text-slate-400">{r.id}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{COLLECTIONS.find((c) => c.value === r.collection)?.label ?? r.collection ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${STATUS_STYLE[r.status] ?? "bg-amber-50 text-amber-700 ring-amber-200"}`}>
                      {r.status}
                    </span>
                    {r.openDraft && (
                      <Link
                        href={`/schemes/${r.openDraft.id}`}
                        className="inline-flex rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-blue-700"
                        title="This scheme has an unpublished draft"
                      >
                        {r.openDraft.status === "approved" ? "Approved draft" : "Open draft"}
                      </Link>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span className="capitalize">{r.level?.replace("_", " + ") ?? "—"}</span>
                  {r.state && <div className="text-xs text-slate-400">{r.state}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Link href={`/schemes/catalog/${r.id}`} className={`${btn.secondary} px-3 py-1.5 text-xs`}>Edit</Link>
                  </div>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No live schemes match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{filtered.length} scheme(s) · page {current + 1} of {pages}</span>
        {pages > 1 && (
          <div className="flex gap-2">
            <button type="button" className={btn.secondary} disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
            <button type="button" className={btn.secondary} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
