"use client";

import { useState, useTransition } from "react";
import { Lock, LockOpen } from "lucide-react";
import { changeAppLock } from "@/app/app-lock/actions";
import { Notice, Panel, btn, field, formatDate } from "@/components/admin/ui";

interface State {
  locked: boolean;
  message: string | null;
  updated_at: string | null;
}

const CONFIRM_WORD = "LOCK";

export function AppLockPanel({ initial, viewOnly }: { initial: State; viewOnly: boolean }) {
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState(initial.message ?? "");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function apply(locked: boolean) {
    setResult(null);
    start(async () => {
      const res = await changeAppLock({ locked, message });
      if (!res.ok) return setResult({ tone: "error", text: res.error });
      setState(res.data);
      setConfirm("");
      setResult({
        tone: "success",
        text: locked
          ? "The app is locked. Every user now sees the locked screen within a minute; the server refuses them at once."
          : "The app is unlocked. Users continue where they left off.",
      });
    });
  }

  return (
    <div className="space-y-5">
      <Panel title="Current state">
        <div className="flex items-center gap-4">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              state.locked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {state.locked ? <Lock className="h-6 w-6" /> : <LockOpen className="h-6 w-6" />}
          </span>
          <div>
            <p className="text-lg font-semibold text-gray-900">{state.locked ? "Locked" : "Unlocked"}</p>
            <p className="text-sm text-gray-500">
              {state.updated_at ? `Changed ${formatDate(state.updated_at)}` : "Never locked"}
            </p>
          </div>
        </div>
        {state.locked && state.message && (
          <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">“{state.message}”</p>
        )}
      </Panel>

      {result && <Notice tone={result.tone}>{result.text}</Notice>}

      {viewOnly ? (
        <Notice tone="info">This is a view-only admin account. Only full admins can lock or unlock the app.</Notice>
      ) : state.locked ? (
        <Panel title="Unlock the app">
          <p className="mb-4 text-sm text-gray-600">Everyone can use the app again right away. Signed-in users stay signed in.</p>
          <button type="button" className={btn.primary} disabled={pending} onClick={() => apply(false)}>
            {pending ? "Unlocking…" : "Unlock the app"}
          </button>
        </Panel>
      ) : (
        <Panel title="Lock the app">
          <div className="space-y-4">
            <Notice tone="warn">
              Every user is locked out at once: the app shows “locked by the administrator” and no one can sign in,
              sign out, sign up or use any feature until you unlock it.
            </Notice>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Message on the locked screen (optional)</span>
              <textarea
                className={field}
                rows={3}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="The app is locked by the administrator. Please contact the administrator."
              />
              <span className="block text-xs text-gray-400">{message.length}/500 · plain text</span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
              </span>
              <input className={`${field} font-mono`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <button
              type="button"
              className={btn.danger}
              disabled={pending || confirm.trim().toUpperCase() !== CONFIRM_WORD}
              onClick={() => apply(true)}
            >
              {pending ? "Locking…" : "Lock the app for everyone"}
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}
