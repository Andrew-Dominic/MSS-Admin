"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { COLLECTIONS, type Collection, type DraftAction, type DraftStatus } from "@/lib/mss/types";
import { withdrawScheme } from "@/app/schemes/actions";
import { Notice, StatusBadge, btn, field, formatDate } from "@/components/admin/ui";

export interface SchemeRow {
  draftId: string;
  schemeId: string;
  name: string;
  collection: Collection | null;
  state: string | null;
  status: DraftStatus;
  action: DraftAction;
  version: number;
  updatedAt: string | null;
  isPublished: boolean;
}

const PAGE = 25;

export function SchemesTable({ rows }: { rows: SchemeRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | DraftStatus>("all");
  const [collection, setCollection] = useState<"all" | Collection>("all");
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (collection === "all" || r.collection === collection) &&
        (!needle || r.schemeId.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle)),
    );
  }, [rows, q, status, collection]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE, current * PAGE + PAGE);
  const counts = useMemo(() => {
    const c: Record<string, number> = { draft: 0, approved: 0, published: 0, discarded: 0 };
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);

  function withdraw(row: SchemeRow) {
    if (!confirm(`Create a withdrawal draft for ${row.schemeId}? It is removed from the app only after it is approved and published.`)) return;
    start(async () => {
      const res = await withdrawScheme(row.schemeId);
      setMessage(res.ok ? { tone: "success", text: `Withdrawal draft created for ${row.schemeId}. Approve and publish it to remove the scheme.` } : { tone: "error", text: res.error });
    });
  }

  if (!rows.length) {
    return (
      <Notice>
        No schemes yet. <Link href="/schemes/upload" className="font-semibold underline">Upload the 2026 datasets</Link> or{" "}
        <Link href="/schemes/new" className="font-semibold underline">create a scheme</Link> to start.
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <span className="sr-only">Search schemes</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search by ID or name"
            className={`${field} pl-9`}
          />
        </label>
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(0); }} className={field}>
          <option value="all">All statuses ({rows.length})</option>
          {(["draft", "approved", "published", "discarded"] as const).map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)} ({counts[s]})</option>
          ))}
        </select>
        <select aria-label="Collection" value={collection} onChange={(e) => { setCollection(e.target.value as typeof collection); setPage(0); }} className={field}>
          <option value="all">All collections</option>
          {COLLECTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Scheme</th>
              <th className="px-4 py-3">Collection</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((r) => (
              <tr key={r.draftId} className="hover:bg-orange-50/30">
                <td className="px-4 py-3">
                  <Link href={`/schemes/${r.draftId}`} className="font-semibold text-gray-900 hover:text-orange-600">{r.name}</Link>
                  <div className="font-mono text-xs text-gray-400">{r.schemeId} · v{r.version}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {COLLECTIONS.find((c) => c.value === r.collection)?.label ?? r.collection ?? "—"}
                  {r.state && r.collection !== "central" ? <div className="text-xs text-gray-400">{r.state}</div> : null}
                </td>
                <td className="px-4 py-3"><StatusBadge status={r.status} action={r.action} /></td>
                <td className="px-4 py-3 text-gray-500">{formatDate(r.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/schemes/${r.draftId}`} className={`${btn.secondary} px-3 py-1.5 text-xs`}>
                      {r.status === "draft" || r.status === "approved" ? "Open" : "View / edit"}
                    </Link>
                    {r.isPublished && r.status === "published" && r.action === "upsert" && (
                      <button type="button" disabled={pending} onClick={() => withdraw(r)} className={`${btn.danger} px-3 py-1.5 text-xs`}>
                        Withdraw
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No schemes match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{filtered.length} schemes · page {current + 1} of {pages}</span>
          <div className="flex gap-2">
            <button type="button" className={btn.secondary} disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
            <button type="button" className={btn.secondary} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
