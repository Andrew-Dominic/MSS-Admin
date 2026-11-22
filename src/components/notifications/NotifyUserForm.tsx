"use client";

import { useState, useTransition } from "react";
import { notifyUser } from "@/app/notifications/actions";
import { Notice, Panel, btn, field } from "@/components/admin/ui";

const TYPES = [
  { value: "updates", label: "Updates" },
  { value: "new_schemes", label: "New schemes" },
  { value: "reminders", label: "Reminders" },
  { value: "profile", label: "Profile" },
];

export function NotifyUserForm({ initialUserId = "" }: { initialUserId?: string }) {
  const [userId, setUserId] = useState(initialUserId);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("updates");
  const [result, setResult] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function send(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    start(async () => {
      const res = await notifyUser({ userId, title, message, type });
      if (!res.ok) return setResult({ tone: "error", text: res.error });
      setResult({ tone: "success", text: "Sent. It appears in the user's in-app inbox, and as a phone notification on their registered devices." });
      setTitle("");
      setMessage("");
    });
  }

  return (
    <Panel title={initialUserId ? "Send to this user" : "Send to one user"}>
      <form onSubmit={send} className="space-y-4">
        {result && <Notice tone={result.tone}>{result.text}</Notice>}
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">User ID</span>
            <input className={`${field} font-mono`} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="11111111-1111-4111-8111-111111111111" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Type</span>
            <select className={field} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">Title</span>
          <input className={field} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">Message</span>
          <textarea className={field} rows={5} value={message} maxLength={5000} onChange={(e) => setMessage(e.target.value)} required />
          <span className="block text-xs text-gray-400">{message.length}/5000 · plain text</span>
        </label>
        <button type="submit" className={btn.primary} disabled={pending}>{pending ? "Sending…" : "Send notification"}</button>
      </form>
    </Panel>
  );
}
