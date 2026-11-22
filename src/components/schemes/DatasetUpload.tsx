"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FileJson } from "lucide-react";
import { previewDataset, stageDataset } from "@/app/schemes/actions";
import { collectionForId, type Collection, type UploadPreview } from "@/lib/mss/types";
import { Notice, Panel, btn } from "@/components/admin/ui";

/** Vercel caps request bodies at 4.5 MB; stay below the server action limit. */
const MAX_BYTES = 3.9 * 1024 * 1024;

interface Envelope {
  schema_version: 1;
  mode: "partial";
  collections: { collection: Collection; meta: { count: number }; schemes: { id: string }[] }[];
}

/**
 * Accepts either an upload envelope ({schema_version, mode, collections}) or a
 * source dataset file ({meta, schemes}) and returns the envelope to send.
 */
function toEnvelope(json: unknown): Envelope {
  const obj = json as Record<string, unknown>;
  if (obj && Array.isArray(obj.collections)) return obj as unknown as Envelope;
  const schemes = (obj?.schemes ?? (Array.isArray(json) ? json : null)) as { id: string }[] | null;
  if (!Array.isArray(schemes) || !schemes.length) throw new Error("No schemes found. Expected a dataset file with a \"schemes\" array.");
  const groups = new Map<Collection, { id: string }[]>();
  for (const s of schemes) {
    const c = collectionForId(String(s?.id ?? ""));
    if (!c) throw new Error(`Scheme "${s?.id}" has an ID that matches no collection (CEN2026-, TN2026-, MAH2026-).`);
    groups.set(c, [...(groups.get(c) ?? []), s]);
  }
  return {
    schema_version: 1,
    mode: "partial",
    collections: [...groups].map(([collection, list]) => ({ collection, meta: { count: list.length }, schemes: list })),
  };
}

export function DatasetUpload() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "warn"; text: string } | null>(null);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    setPreview(null);
    setEnvelope(null);
    setMessage(null);
    if (!file) return;
    setFileName(file.name);
    try {
      const env = toEnvelope(JSON.parse(await file.text()));
      const size = new Blob([JSON.stringify(env)]).size;
      if (size > MAX_BYTES) {
        throw new Error(`This upload is ${(size / 1048576).toFixed(1)} MB; the limit is 3.9 MB. Upload one collection file at a time, or split the file.`);
      }
      setEnvelope(env);
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    }
  }

  function runPreview() {
    if (!envelope) return;
    setMessage(null);
    start(async () => {
      const res = await previewDataset(envelope);
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      setPreview(res.data);
    });
  }

  function stage() {
    if (!preview) return;
    start(async () => {
      const res = await stageDataset(preview.upload_id);
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      setMessage({ tone: "success", text: `${res.data.drafts} drafts created. Review and approve them, then publish from Releases.` });
      setPreview(null);
      setEnvelope(null);
    });
  }

  const total = envelope?.collections.reduce((n, c) => n + c.schemes.length, 0) ?? 0;
  const changes = preview ? preview.new.length + preview.changed.length : 0;

  return (
    <div className="space-y-5">
      {message && <Notice tone={message.tone}>{message.text}{message.tone === "success" && <> <Link className="font-semibold underline" href="/schemes">Open schemes</Link></>}</Notice>}

      <Panel title="1. Choose a file">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center hover:border-blue-300 hover:bg-blue-50/30">
          <FileJson className="h-8 w-8 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">{fileName ?? "Select a .json dataset file"}</span>
          <span className="text-xs text-gray-500">A source file such as central_schemes_master_2026.json, or an upload envelope. Up to 2000 schemes and 3.9 MB.</span>
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {envelope && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <span>
              {total} schemes in {envelope.collections.map((c) => `${c.collection} (${c.schemes.length})`).join(", ")}
            </span>
            <button type="button" className={btn.primary} disabled={pending} onClick={runPreview}>
              {pending && !preview ? "Checking…" : "2. Preview changes"}
            </button>
          </div>
        )}
      </Panel>

      {preview && (
        <Panel title="Preview" actions={<span className="text-xs text-gray-400">Nothing has been saved yet</span>}>
          <div className="grid gap-3 sm:grid-cols-4">
            {([
              ["New", preview.new.length, "text-emerald-600"],
              ["Changed", preview.changed.length, "text-blue-600"],
              ["Unchanged", preview.unchanged.length, "text-gray-500"],
              ["Invalid", preview.invalid.length, "text-red-600"],
            ] as const).map(([label, n, color]) => (
              <div key={label} className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{n}</div>
              </div>
            ))}
          </div>
          {preview.invalid.length > 0 && (
            <div className="mt-4">
              <Notice tone="error">
                This upload can&apos;t be staged until these records are fixed:
                <ul className="mt-2 list-inside list-disc font-mono text-xs">
                  {preview.invalid.slice(0, 50).map((r, i) => <li key={i}>{r.id ?? "?"}: {r.code ?? JSON.stringify(r)}</li>)}
                </ul>
              </Notice>
            </div>
          )}
          {preview.valid && changes > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600">Staging creates {changes} drafts. Nothing reaches the app until they&apos;re approved and published.</span>
              <button type="button" className={btn.primary} disabled={pending} onClick={stage}>{pending ? "Staging…" : "3. Stage as drafts"}</button>
            </div>
          )}
          {preview.valid && changes === 0 && <div className="mt-4"><Notice tone="warn">Everything in this file is already published unchanged.</Notice></div>}
        </Panel>
      )}
    </div>
  );
}
