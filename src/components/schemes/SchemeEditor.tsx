"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { approveScheme, discardScheme, saveScheme } from "@/app/schemes/actions";
import {
  COLLECTIONS,
  collectionForId,
  type AuditEvent,
  type Collection,
  type DraftAction,
  type DraftStatus,
  type SchemeRecord,
} from "@/lib/mss/types";
import { Notice, Panel, StatusBadge, btn, field, formatDate } from "@/components/admin/ui";

type Lang = "en" | "hi" | "ta";
const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी Hindi" },
  { code: "ta", label: "தமிழ் Tamil" },
];
const STATUS_VALUES = ["active", "announced", "unknown", "closed"];
const APPLICATION_STATUS = ["open", "closed", "unknown", "announced"];

export interface EditorDraft {
  id: string;
  version: number;
  status: DraftStatus;
  action: DraftAction;
  reviewNote?: string | null;
  updatedAt?: string | null;
  audit?: AuditEvent[];
}

/** Lines of a textarea <-> string[] (blank lines dropped). */
const toLines = (v: unknown) => (Array.isArray(v) ? v.join("\n") : "");
const fromLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function getIn(obj: unknown, path: (string | number)[]): unknown {
  return path.reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k as string] : undefined), obj);
}

function setIn<T>(obj: T, path: (string | number)[], value: unknown): T {
  const clone: Record<string, unknown> = Array.isArray(obj) ? ([...obj] as unknown as Record<string, unknown>) : { ...(obj as Record<string, unknown>) };
  const [head, ...rest] = path;
  clone[head as string] = rest.length ? setIn((clone[head as string] ?? {}) as unknown, rest, value) : value;
  return clone as T;
}

export const EMPTY_SCHEME: SchemeRecord = {
  id: "",
  level: "central",
  state: "All India",
  name: { en: "", hi: null, ta: null },
  short_name: { en: null, hi: null, ta: null },
  authority: null,
  category: null,
  status: { value: "active", note: null, as_of: null },
  description: { en: [] },
  benefits: { en: [] },
  eligibility: { en: [] },
  how_to_apply: { application_status: "unknown", mode: null, steps: { en: [] }, documents: [], notes: [], apply_url: null, info_url: null, guidelines_url: null },
  related_ids: [],
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

export function SchemeEditor({
  initial,
  initialCollection,
  draft,
  lockIdentity = false,
}: {
  initial: SchemeRecord;
  initialCollection: Collection | null;
  /** The draft being edited; absent for a brand-new scheme. */
  draft?: EditorDraft;
  /** Editing a live catalogue scheme: id and collection stay fixed. */
  lockIdentity?: boolean;
}) {
  const router = useRouter();
  const [record, setRecord] = useState<SchemeRecord>(initial);
  const [collection, setCollection] = useState<Collection | "">(initialCollection ?? "");
  const [lang, setLang] = useState<Lang>("en");
  const [tab, setTab] = useState<"form" | "json">("form");
  const [json, setJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [review, setReview] = useState<"approve" | "discard" | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "warn"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const isOpen = !draft || ((draft.status === "draft" || draft.status === "approved") && draft.action === "upsert");
  // A published/discarded revision is read-only; saving creates a new draft from it.
  const createsNewDraft = !draft || !isOpen;
  const isNew = !draft && !lockIdentity;

  const set = (path: (string | number)[], value: unknown) => setRecord((r) => setIn(r, path, value));
  const text = (path: (string | number)[]) => String(getIn(record, path) ?? "");
  const nullable = (v: string) => (v.trim() ? v : null);

  function openJson() {
    setJson(JSON.stringify(record, null, 2));
    setJsonError(null);
    setTab("json");
  }

  function applyJson(): boolean {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The record must be a JSON object.");
      setRecord(parsed);
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError((e as Error).message);
      return false;
    }
  }

  function save() {
    if (tab === "json" && !applyJson()) return;
    const scheme = tab === "json" ? JSON.parse(json) : record;
    const col = (collection || collectionForId(scheme.id) || "") as Collection;
    setMessage(null);
    start(async () => {
      const res = await saveScheme({
        draftId: createsNewDraft ? undefined : draft?.id,
        version: createsNewDraft ? undefined : draft?.version,
        collection: col,
        scheme,
      });
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      if (res.data.unchanged) return setMessage({ tone: "warn", text: "Nothing changed compared with the published version, so no draft was created." });
      setMessage({ tone: "success", text: "Draft saved. Approve it, then publish it from Releases." });
      if (res.data.draftId && res.data.draftId !== draft?.id) router.push(`/schemes/${res.data.draftId}`);
      else router.refresh();
    });
  }

  function submitReview() {
    if (!draft || !review) return;
    setMessage(null);
    start(async () => {
      const res = review === "approve" ? await approveScheme(draft.id, draft.version, note) : await discardScheme(draft.id, draft.version, note);
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      setReview(null);
      setNote("");
      setMessage({ tone: "success", text: review === "approve" ? "Approved. Publish it from Releases to send it to the app." : "Draft discarded." });
      router.refresh();
    });
  }

  const listArea = (path: string[], label: string, hint = "One item per line.") => (
    <Field label={label} hint={hint}>
      <textarea
        rows={4}
        className={field}
        value={toLines(getIn(record, path))}
        onChange={(e) => set(path, fromLines(e.target.value))}
        lang={lang}
        dir="auto"
      />
    </Field>
  );

  return (
    <div className="space-y-5">
      {draft && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
          <StatusBadge status={draft.status} action={draft.action} />
          <span className="text-gray-500">Revision v{draft.version}</span>
          <span className="text-gray-400">Updated {formatDate(draft.updatedAt)}</span>
          {draft.reviewNote && <span className="text-gray-500">Note: “{draft.reviewNote}”</span>}
        </div>
      )}
      {!isOpen && draft && (
        <Notice tone="info">
          This revision is {draft.status}{draft.action === "withdraw" ? " (a withdrawal)" : ""} and can&apos;t be changed.
          {draft.action === "upsert" ? " Edit below and save to start a new draft from it." : ""}
        </Notice>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="flex gap-2 border-b border-gray-200">
        {(["form", "json"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              if (t === tab) return;
              if (t === "json") openJson();
              else if (applyJson()) setTab("form");
            }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            {t === "form" ? "Form" : "Advanced JSON"}
          </button>
        ))}
      </div>

      {tab === "json" ? (
        <Panel title="Full scheme record">
          <p className="mb-3 text-sm text-gray-500">The complete record in the master dataset format, including fields the form doesn&apos;t show (translations, benefit facts, contacts…).</p>
          <textarea rows={28} spellCheck={false} className={`${field} font-mono text-xs`} value={json} onChange={(e) => setJson(e.target.value)} />
          {jsonError && <p className="mt-2 text-sm text-red-600" role="alert">Invalid JSON: {jsonError}</p>}
        </Panel>
      ) : (
        <>
          <Panel title="Basics">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Scheme ID" hint="CEN2026-### central, TN2026-### Tamil Nadu, MAH2026-### Maharashtra. Can't change after creation.">
                <input
                  className={`${field} font-mono`}
                  value={record.id}
                  disabled={!isNew}
                  onChange={(e) => {
                    const id = e.target.value.toUpperCase();
                    set(["id"], id);
                    const c = collectionForId(id);
                    if (c) setCollection(c);
                  }}
                  placeholder="CEN2026-301"
                />
              </Field>
              <Field label="Collection">
                <select className={field} value={collection} disabled={!isNew} onChange={(e) => setCollection(e.target.value as Collection)}>
                  <option value="">Choose…</option>
                  {COLLECTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Level">
                <select className={field} value={text(["level"])} onChange={(e) => set(["level"], e.target.value)}>
                  <option value="central">Central</option>
                  <option value="state">State</option>
                  <option value="central_state">Central + state</option>
                </select>
              </Field>
              <Field label="State" hint='"All India" for nationwide schemes.'>
                <input className={field} value={text(["state"])} onChange={(e) => set(["state"], e.target.value)} />
              </Field>
              {LANGS.map((l) => (
                <Field key={l.code} label={`Name (${l.label})${l.code === "en" ? " *" : ""}`}>
                  <input className={field} lang={l.code} dir="auto" value={text(["name", l.code])} onChange={(e) => set(["name", l.code], l.code === "en" ? e.target.value : nullable(e.target.value))} />
                </Field>
              ))}
              <Field label="Short name (English)">
                <input className={field} value={text(["short_name", "en"])} onChange={(e) => set(["short_name", "en"], nullable(e.target.value))} placeholder="PMEGP" />
              </Field>
              <Field label="Authority">
                <input className={field} value={text(["authority"])} onChange={(e) => set(["authority"], nullable(e.target.value))} placeholder="Ministry of MSME" />
              </Field>
              <Field label="Category">
                <input className={field} value={text(["category"])} onChange={(e) => set(["category"], nullable(e.target.value))} placeholder="Credit linked capital subsidy" />
              </Field>
              <Field label="Scheme status">
                <select className={field} value={text(["status", "value"]) || "unknown"} onChange={(e) => set(["status", "value"], e.target.value)}>
                  {STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Status note">
                <input className={field} value={text(["status", "note"])} onChange={(e) => set(["status", "note"], nullable(e.target.value))} />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Content"
            actions={
              <div className="flex gap-1 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Content language">
                {LANGS.map((l) => (
                  <button key={l.code} type="button" role="tab" aria-selected={lang === l.code} onClick={() => setLang(l.code)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${lang === l.code ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              {listArea(["description", lang], "Description")}
              {listArea(["benefits", lang], "Benefits")}
              {listArea(["eligibility", lang], "Eligibility")}
              {listArea(["how_to_apply", "steps", lang], "How to apply — steps")}
            </div>
            {lang !== "en" && <p className="mt-3 text-xs text-gray-400">Leave a language empty to show the English text for it in the app.</p>}
          </Panel>

          <Panel title="Applying">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Application status">
                <select className={field} value={text(["how_to_apply", "application_status"]) || "unknown"} onChange={(e) => set(["how_to_apply", "application_status"], e.target.value)}>
                  {APPLICATION_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Mode">
                <input className={field} value={text(["how_to_apply", "mode"])} onChange={(e) => set(["how_to_apply", "mode"], nullable(e.target.value))} placeholder="Online through the PMEGP portal" />
              </Field>
              {(["apply_url", "info_url", "guidelines_url", "portal"] as const).map((k) => (
                <Field key={k} label={{ apply_url: "Apply URL", info_url: "Information URL", guidelines_url: "Guidelines URL", portal: "Portal name" }[k]}>
                  <input className={field} type={k === "portal" ? "text" : "url"} value={text(["how_to_apply", k])} onChange={(e) => set(["how_to_apply", k], nullable(e.target.value))} placeholder={k === "portal" ? "" : "https://"} />
                </Field>
              ))}
              {(["fees", "deadline", "prerequisite"] as const).map((k) => (
                <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                  <input className={field} value={text(["how_to_apply", k])} onChange={(e) => set(["how_to_apply", k], nullable(e.target.value))} />
                </Field>
              ))}
              <Field label="Related scheme IDs" hint="Comma separated, e.g. CEN2026-014, TN2026-003">
                <input className={`${field} font-mono`} value={(record.related_ids ?? []).join(", ")}
                  onChange={(e) => set(["related_ids"], e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))} />
              </Field>
            </div>
            <div className="mt-4">{listArea(["how_to_apply", "notes"], "Notes")}</div>
          </Panel>
        </>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-gray-200 bg-[#F4F7F9]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        {(isOpen || draft?.action === "upsert") && (
          <button type="button" className={btn.primary} disabled={pending} onClick={save}>
            {pending ? "Saving…" : createsNewDraft ? (isNew ? "Create draft" : lockIdentity ? "Save changes as draft" : "Save as new draft") : "Save draft"}
          </button>
        )}
        {draft && isOpen && (
          <>
            {draft.status === "draft" && (
              <button type="button" className={btn.secondary} disabled={pending} onClick={() => setReview(review === "approve" ? null : "approve")}>Approve…</button>
            )}
            <button type="button" className={btn.danger} disabled={pending} onClick={() => setReview(review === "discard" ? null : "discard")}>Discard…</button>
          </>
        )}
        {draft?.status === "approved" && <span className="text-sm text-blue-700">Approved — publish it from <a className="font-semibold underline" href="/releases">Releases</a>.</span>}
      </div>

      {review && draft && (
        <Panel title={review === "approve" ? "Approve this revision" : "Discard this draft"}>
          <Field label="Review note" hint="10–2000 characters. Approving also accepts that translations may not be independently reviewed.">
            <textarea rows={3} className={field} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={review === "approve" ? "Verified against the official guidelines" : "Superseded after source review"} />
          </Field>
          <div className="mt-3 flex gap-2">
            <button type="button" className={review === "approve" ? btn.primary : btn.danger} disabled={pending || note.trim().length < 10} onClick={submitReview}>
              {review === "approve" ? "Approve" : "Discard draft"}
            </button>
            <button type="button" className={btn.secondary} onClick={() => setReview(null)}>Cancel</button>
          </div>
        </Panel>
      )}

      {draft?.audit && draft.audit.length > 0 && (
        <Panel title="History">
          <ol className="space-y-2 text-sm">
            {draft.audit.map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-3 text-gray-600">
                <span className="font-medium capitalize text-gray-900">{a.event.replace(/_/g, " ")}</span>
                <span>v{a.version}</span>
                <span className="text-gray-400">{formatDate(a.created_at)}</span>
                <span className="font-mono text-xs text-gray-400">{a.actor_id.slice(0, 8)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}
