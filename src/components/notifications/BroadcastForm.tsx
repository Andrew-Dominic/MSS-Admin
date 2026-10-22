"use client";

import { useMemo, useState, useTransition } from "react";
import { broadcastNotification } from "@/app/notifications/actions";
import { ConfirmBar, Notice, Panel, btn, field } from "@/components/admin/ui";
import { BROADCAST_LANGUAGES, NOTIFICATION_TYPES, STATES } from "@/lib/mss/types";
import { BroadcastProgressCard } from "./BroadcastProgressCard";

const newKey = () => crypto.randomUUID();

/** Send one notification to all users, or to the users in some states/languages. */
export function BroadcastForm({ initialBroadcastId, supported }: { initialBroadcastId?: string; supported: boolean }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("new_schemes");
  const [everyone, setEveryone] = useState(true);
  const [states, setStates] = useState<Set<string>>(new Set());
  const [languages, setLanguages] = useState<Set<string>>(new Set());
  const [stateFilter, setStateFilter] = useState("");
  // One key per campaign: a retry after a timeout replays instead of sending twice.
  const [campaignKey, setCampaignKey] = useState(newKey);
  const [result, setResult] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [tracking, setTracking] = useState<string | undefined>(initialBroadcastId);
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const shownStates = useMemo(() => {
    const q = stateFilter.trim().toLowerCase();
    return q ? STATES.filter((s) => s.name.toLowerCase().includes(q) || s.code === q) : STATES;
  }, [stateFilter]);

  const languageNames = [...languages].map((l) => BROADCAST_LANGUAGES.find((x) => x.value === l)?.label).join(" or ");
  const audienceText = everyone
    ? "all users"
    : states.size || languages.size
      ? `users${states.size ? ` in ${states.size === 1 ? STATES.find((s) => states.has(s.code))?.name : `${states.size} states`}` : ""}${
          languages.size ? ` who use the app in ${languageNames}` : ""
        }`
      : "nobody yet";

  const toggle = (set: Set<string>, value: string, update: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    update(next);
  };

  // Any edit to the content or audience is a new campaign.
  const edited = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setCampaignKey(newKey());
    setConfirming(false);
  };

  function send(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    if (!everyone && !states.size && !languages.size) {
      return setResult({ tone: "error", text: "Choose at least one state or language, or send to everyone." });
    }
    setConfirming(true);
  }

  function confirmSend() {
    setConfirming(false);
    start(async () => {
      const res = await broadcastNotification({
        title,
        message,
        type,
        states: everyone ? [] : [...states],
        languages: everyone ? [] : [...languages],
        campaignKey,
      });
      if (!res.ok) return setResult({ tone: "error", text: res.error });
      setResult({
        tone: "success",
        text: `Queued for ${res.data.recipients.toLocaleString("en-IN")} user(s). Each gets it in the app inbox, and as a phone notification on registered devices.`,
      });
      setTracking(res.data.broadcast_id);
      setTitle("");
      setMessage("");
      setCampaignKey(newKey());
    });
  }

  return (
    <div className="space-y-5">
      {tracking && <BroadcastProgressCard key={tracking} broadcastId={tracking} />}
      <Panel title="Send to many users">
        <form onSubmit={send} className="space-y-4">
          {!supported && <Notice tone="warn">This MSS server doesn&apos;t support notification broadcasts yet (it needs the API update with migration 020). Ask the backend developer to deploy it.</Notice>}
          {result && <Notice tone={result.tone}>{result.text}</Notice>}
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Title</span>
              <input className={field} value={title} maxLength={200} onChange={(e) => edited(setTitle)(e.target.value)} required />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Type</span>
              <select className={field} value={type} onChange={(e) => edited(setType)(e.target.value)}>
                {NOTIFICATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Message</span>
            <textarea className={field} rows={4} value={message} maxLength={5000} onChange={(e) => edited(setMessage)(e.target.value)} required />
            <span className="block text-xs text-gray-400">{message.length}/5000 · plain text</span>
          </label>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-gray-700">Audience</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="audience" className="accent-orange-500" checked={everyone} onChange={() => edited(setEveryone)(true)} />
                Everyone
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="audience" className="accent-orange-500" checked={!everyone} onChange={() => edited(setEveryone)(false)} />
                Only some states and/or languages
              </label>
            </div>

            {!everyone && (
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-700">States {states.size ? `(${states.size})` : "(any)"}</span>
                    <div className="flex items-center gap-2">
                      <input className={`${field} h-9 w-48`} placeholder="Filter states" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} aria-label="Filter states" />
                      {states.size > 0 && (
                        <button type="button" className="text-xs font-semibold text-orange-600" onClick={() => edited(setStates)(new Set())}>Clear</button>
                      )}
                    </div>
                  </div>
                  <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                    {shownStates.map((s) => (
                      <label key={s.code} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-white">
                        <input type="checkbox" className="accent-orange-500" checked={states.has(s.code)} onChange={() => toggle(states, s.code, edited(setStates))} />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="mb-2 block text-sm font-medium text-gray-700">App language {languages.size ? `(${languages.size})` : "(any)"}</span>
                  <div className="flex flex-wrap gap-4">
                    {BROADCAST_LANGUAGES.map((l) => (
                      <label key={l.value} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="accent-orange-500" checked={languages.has(l.value)} onChange={() => toggle(languages, l.value, edited(setLanguages))} />
                        {l.label}
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  A user matches if their profile is in any chosen state <em>and</em> uses any chosen language. Users without a completed
                  profile only receive broadcasts sent to everyone.
                </p>
              </div>
            )}
          </fieldset>

          {confirming && (
            <ConfirmBar confirmLabel={`Yes, send to ${audienceText}`} onConfirm={confirmSend} onCancel={() => setConfirming(false)} pending={pending}>
              Send “{title.trim()}” to {audienceText}? This can&apos;t be undone.
            </ConfirmBar>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <span className="text-xs text-gray-500">Sends to {audienceText}. Limit: 5 broadcasts per hour (including “Notify users” on publish).</span>
            <button type="submit" className={btn.primary} disabled={pending || !supported || confirming}>{pending ? "Sending…" : "Send broadcast"}</button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
