"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { approveScheme, publishApproved } from "@/app/schemes/actions";
import type { DraftAction, DraftStatus } from "@/lib/mss/types";
import { Notice, Panel, StatusBadge, btn, field } from "@/components/admin/ui";

export interface OpenDraft {
  id: string;
  schemeId: string;
  name: string;
  status: DraftStatus;
  action: DraftAction;
  version: number;
}

/** The API allows 20 scheme-admin requests per minute per admin. */
const APPROVE_GAP_MS = 3_200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ReleasesManager({ drafts }: { drafts: OpenDraft[] }) {
  const router = useRouter();
  const waiting = useMemo(() => drafts.filter((d) => d.status === "draft"), [drafts]);
  const approved = useMemo(() => drafts.filter((d) => d.status === "approved"), [drafts]);
  const [toApprove, setToApprove] = useState<Set<string>>(new Set());
  const [toPublish, setToPublish] = useState<Set<string>>(() => new Set(approved.map((d) => d.id)));
  const selectedApproved = useMemo(() => approved.filter((d) => toPublish.has(d.id)), [approved, toPublish]);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "warn"; text: ReactNode } | null>(null);
  const [notify, setNotify] = useState(true);
  const [pending, start] = useTransition();
  const cancel = useRef(false);
  // One idempotency key per exact publish request, kept across retries so an
  // uncertain failure can be retried without publishing (or notifying) twice.
  const publishKey = useRef<{ request: string; key: string } | null>(null);

  const toggle = (set: Set<string>, id: string, update: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update(next);
  };

  async function approveSelected() {
    const list = waiting.filter((d) => toApprove.has(d.id));
    if (!list.length || note.trim().length < 10) return;
    cancel.current = false;
    setMessage(null);
    const failed: string[] = [];
    setProgress({ done: 0, total: list.length, failed });
    for (let i = 0; i < list.length && !cancel.current; i++) {
      const d = list[i];
      let res = await approveScheme(d.id, d.version, note);
      if (!res.ok && /Too many requests|HTTP 429/.test(res.error)) {
        await sleep(30_000);
        res = await approveScheme(d.id, d.version, note);
      }
      if (!res.ok) failed.push(`${d.schemeId}: ${res.error}`);
      setProgress({ done: i + 1, total: list.length, failed: [...failed] });
      if (i < list.length - 1) await sleep(APPROVE_GAP_MS);
    }
    setToApprove(new Set());
    setMessage(
      failed.length
        ? { tone: "warn", text: `${list.length - failed.length} approved, ${failed.length} failed.` }
        : { tone: "success", text: `${list.length} drafts approved. Publish them below.` },
    );
    router.refresh();
  }

  function publish() {
    const list = selectedApproved.map((d) => ({ id: d.id, version: d.version }));
    if (!list.length) return;
    const ask = notify
      ? `Publish ${list.length} approved scheme change(s) to the app and notify the users they apply to?`
      : `Publish ${list.length} approved scheme change(s) to the app now, without notifying users?`;
    if (!confirm(ask)) return;
    const request = JSON.stringify({ list, notify });
    if (publishKey.current?.request !== request) {
      publishKey.current = { request, key: `publish-${crypto.randomUUID()}` };
    }
    const key = publishKey.current.key;
    setMessage(null);
    start(async () => {
      const res = await publishApproved(list, key, notify);
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      publishKey.current = null;
      const b = res.data.broadcast;
      setMessage({
        tone: "success",
        text: (
          <>
            {res.data.replayed
              ? `Already published as release ${res.data.release_version}.`
              : `Published ${res.data.published} change(s) as release ${res.data.release_version}. Apps pick it up on their next catalogue check.`}
            {b && (
              <>
                {" "}
                Notifying {b.recipients.toLocaleString("en-IN")} user(s).{" "}
                <Link className="font-semibold underline" href={`/notifications?broadcast=${b.broadcast_id}`}>
                  Track delivery
                </Link>
              </>
            )}
            {notify && b === null && " No notification was sent: the release only withdraws schemes."}
          </>
        ),
      });
      router.refresh();
    });
  }

  const running = progress !== null && progress.done < progress.total;
  // Only drafts still approved count: published ones leave the list on refresh.
  const publishCount = selectedApproved.length;

  return (
    <div className="space-y-5">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Panel
        title={`Ready to publish (${approved.length})`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4 accent-orange-500" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Notify users
            </label>
            <button type="button" className={btn.primary} disabled={pending || running || !publishCount} onClick={publish}>
              {pending ? "Publishing…" : `Publish ${publishCount || ""}`.trim()}
            </button>
          </div>
        }
      >
        <p className="mb-3 text-xs text-gray-500">
          With <strong>Notify users</strong>, everyone in the states the published schemes cover (all users for nationwide schemes) gets a
          “New schemes” notification in the app and on their phone. Withdrawals alone notify nobody.
        </p>
        {approved.length === 0 ? (
          <p className="text-sm text-gray-500">No approved drafts. Approve drafts below first.</p>
        ) : (
          <DraftList drafts={approved} selected={toPublish} onToggle={(id) => toggle(toPublish, id, setToPublish)} onAll={(on) => setToPublish(on ? new Set(approved.map((d) => d.id)) : new Set())} />
        )}
      </Panel>

      <Panel title={`Waiting for approval (${waiting.length})`}>
        {waiting.length === 0 ? (
          <p className="text-sm text-gray-500">No drafts are waiting for approval.</p>
        ) : (
          <>
            <DraftList drafts={waiting} selected={toApprove} onToggle={(id) => toggle(toApprove, id, setToApprove)} onAll={(on) => setToApprove(on ? new Set(waiting.map((d) => d.id)) : new Set())} />
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Review note for the selected drafts</span>
                <input className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Verified against the 2026 official sources" />
                <span className="block text-xs text-gray-400">10–2000 characters. Approving accepts that translations may not be independently reviewed. Check each draft before approving.</span>
              </label>
              {running ? (
                <button type="button" className={btn.secondary} onClick={() => (cancel.current = true)}>Stop</button>
              ) : (
                <button type="button" className={btn.primary} disabled={!toApprove.size || note.trim().length < 10} onClick={approveSelected}>
                  Approve {toApprove.size || ""}
                </button>
              )}
            </div>
            {progress && (
              <div className="mt-4 space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
                  <div className="h-full bg-orange-500 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
                <p className="text-xs text-gray-500">
                  {progress.done} of {progress.total} approved{running ? ` · about ${Math.ceil(((progress.total - progress.done) * APPROVE_GAP_MS) / 60000)} min left (the server allows 20 per minute)` : ""}
                </p>
                {progress.failed.length > 0 && (
                  <Notice tone="error"><ul className="list-inside list-disc text-xs">{progress.failed.map((f) => <li key={f}>{f}</li>)}</ul></Notice>
                )}
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

function DraftList({ drafts, selected, onToggle, onAll }: { drafts: OpenDraft[]; selected: Set<string>; onToggle: (id: string) => void; onAll: (on: boolean) => void }) {
  const all = drafts.every((d) => selected.has(d.id));
  return (
    <div className="max-h-[420px] overflow-y-auto rounded-xl border border-gray-100">
      <label className="sticky top-0 flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <input type="checkbox" checked={all} onChange={(e) => onAll(e.target.checked)} className="h-4 w-4 accent-orange-500" />
        Select all
      </label>
      {drafts.map((d) => (
        <label key={d.id} className="flex items-center gap-3 border-b border-gray-50 px-4 py-2.5 text-sm last:border-0 hover:bg-orange-50/30">
          <input type="checkbox" checked={selected.has(d.id)} onChange={() => onToggle(d.id)} className="h-4 w-4 accent-orange-500" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-gray-900">{d.name}</span>
            <span className="font-mono text-xs text-gray-400">{d.schemeId} · v{d.version}</span>
          </span>
          <StatusBadge status={d.status} action={d.action} />
          <Link href={`/schemes/${d.id}`} className="text-xs font-semibold text-orange-600 hover:underline" onClick={(e) => e.stopPropagation()}>Review</Link>
        </label>
      ))}
    </div>
  );
}
