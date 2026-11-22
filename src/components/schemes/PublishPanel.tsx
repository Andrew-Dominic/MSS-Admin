"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Rocket } from "lucide-react";
import { publishAndNotify, type PublishAndNotifyResult } from "@/app/schemes/actions";
import { ConfirmBar, Notice, Panel, btn, field } from "@/components/admin/ui";
import { NOTIFICATION_TYPES, type DraftStatus } from "@/lib/mss/types";
import type { NotificationDraft } from "@/lib/mss/changes";

/** Approve + publish one draft as a release, and optionally notify users, in one step. */
export function PublishPanel({
  draftId,
  version,
  status,
  isOpen,
  notifySupported,
  changes,
  defaults,
}: {
  draftId: string;
  version: number;
  status: DraftStatus;
  /** The draft is still draft/approved (the panel stays to show a result after publishing). */
  isOpen: boolean;
  notifySupported: boolean;
  /** Changed fields vs the live scheme; null for a brand-new scheme. */
  changes: string[] | null;
  defaults: NotificationDraft;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(notifySupported);
  const [title, setTitle] = useState(defaults.title);
  const [message, setMessage] = useState(defaults.message);
  const [type, setType] = useState<string>(defaults.type);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishAndNotifyResult | null>(null);
  const [pending, start] = useTransition();
  // Kept across retries so an uncertain attempt replays instead of repeating.
  const publishKey = useRef<string | null>(null);
  const campaignKey = useRef<string | null>(null);

  if (!isOpen && !result) return null;

  const needsNote = status === "draft";
  const noteOk = !needsNote || (note.trim().length >= 10 && note.trim().length <= 2000);
  const textOk = !notify || (title.trim().length >= 1 && title.length <= 200 && message.trim().length >= 1 && message.length <= 5000);

  const editText = (fn: () => void) => {
    fn();
    campaignKey.current = null; // different content = a different campaign
  };

  function run() {
    setConfirming(false);
    setError(null);
    publishKey.current ??= `publish-${crypto.randomUUID()}`;
    if (notify) campaignKey.current ??= crypto.randomUUID();
    start(async () => {
      const res = await publishAndNotify({
        draftId,
        version,
        note,
        publishKey: publishKey.current!,
        notify: notify ? { title, message, type, campaignKey: campaignKey.current! } : null,
      });
      if (!res.ok) return setError(res.error);
      setResult(res.data);
      if (res.data.broadcastError) setError(`Published, but the notification was not sent: ${res.data.broadcastError} You can retry the notification from here.`);
      router.refresh();
    });
  }

  if (result && !result.broadcastError) {
    return (
      <Panel title="Published">
        <Notice tone="success">
          {result.releaseVersion ? <>Published as release <span className="font-mono font-semibold">{result.releaseVersion}</span>{result.replayed ? " (already done earlier)" : ""}. </> : "The scheme is published. "}
          The app picks it up on its next catalogue refresh.
          {result.broadcast && <> Notification queued for {result.broadcast.recipients} user(s).</>}
        </Notice>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/releases" className={btn.secondary}><Rocket className="h-4 w-4" /> Releases</Link>
          {result.broadcast && (
            <Link href={`/notifications?broadcast=${result.broadcast.broadcast_id}`} className={btn.secondary}>
              <Bell className="h-4 w-4" /> Track delivery
            </Link>
          )}
        </div>
      </Panel>
    );
  }

  const retryingNotify = Boolean(result?.broadcastError);

  return (
    <Panel title={retryingNotify ? "Send the notification" : "Approve, publish and notify"}>
      <div className="space-y-4">
        {!retryingNotify && (
          <p className="text-sm text-slate-500">
            Publishes the saved revision (v{version}) to the app as its own release. Save any edits below first.
          </p>
        )}
        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-semibold">{changes ? "Changes vs the live scheme: " : "New scheme: "}</span>
          {changes ? (changes.length ? changes.join(", ") : "no visible field changes") : "not in the app yet"}
        </div>
        {needsNote && !retryingNotify && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Approval note</span>
            <textarea rows={2} className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Verified against the official guidelines" />
            <span className="block text-xs text-gray-400">10–2000 characters, required to approve.</span>
          </label>
        )}
        {notifySupported ? (
          <>
            {!retryingNotify && (
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Notify users <span className="font-normal text-slate-500">({defaults.audienceLabel})</span>
              </label>
            )}
            {notify && (
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-gray-700">Notification title</span>
                    <input className={field} value={title} maxLength={200} onChange={(e) => editText(() => setTitle(e.target.value))} />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-gray-700">Notification type</span>
                    <select className={field} value={type} onChange={(e) => editText(() => setType(e.target.value))}>
                      {NOTIFICATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Notification message</span>
                  <textarea rows={3} className={field} value={message} maxLength={5000} onChange={(e) => editText(() => setMessage(e.target.value))} />
                  <span className="block text-xs text-gray-400">{message.length}/5000 · plain text · at most 5 broadcasts per hour</span>
                </label>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">The API on this server can&apos;t send broadcasts, so this publishes without notifying.</p>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {confirming ? (
          <ConfirmBar
            confirmLabel={retryingNotify ? "Yes, send" : "Yes, publish"}
            onConfirm={run}
            onCancel={() => setConfirming(false)}
            pending={pending}
          >
            {retryingNotify
              ? `Send “${title.trim()}” to ${defaults.audienceLabel.toLowerCase()}?`
              : `${needsNote ? "Approve and publish" : "Publish"} this scheme to the app${notify ? ` and notify ${defaults.audienceLabel.toLowerCase()}` : ""}?`}
          </ConfirmBar>
        ) : (
          <button type="button" className={btn.primary} disabled={pending || !noteOk || !textOk} onClick={() => setConfirming(true)}>
            <Rocket className="h-4 w-4" />
            {pending ? "Working…" : retryingNotify ? "Retry notification" : `${needsNote ? "Approve + publish" : "Publish"}${notify ? " + notify" : ""}`}
          </button>
        )}
      </div>
    </Panel>
  );
}
