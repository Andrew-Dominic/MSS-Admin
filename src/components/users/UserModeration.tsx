"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw, ShieldCheck, Trash2, UserMinus } from "lucide-react";
import { moderateUser, type ModerationAction } from "@/app/users/actions";
import { btn, field } from "@/components/admin/ui";

interface Props {
  userId: string;
  name: string;
  email: string | null;
  banned: boolean;
  deleted: boolean;
}

const COPY: Record<ModerationAction, { title: string; text: string; confirm: string; done: string }> = {
  remove: {
    title: "Remove this account",
    text: "The user is signed out everywhere and cannot sign in or restore it. Their data is kept for 30 days, then deleted. You can restore it until then.",
    confirm: "Remove account",
    done: "Account removed.",
  },
  restore: {
    title: "Restore this account",
    text: "The account and its data come back. The user can sign in again.",
    confirm: "Restore account",
    done: "Account restored.",
  },
  ban: {
    title: "Ban this account",
    text: "The user is signed out everywhere and can no longer sign in or use the API, with this Google account or this email. Their data is kept. You can unban later.",
    confirm: "Ban account",
    done: "Account banned.",
  },
  unban: {
    title: "Unban this account",
    text: "The user can sign in again.",
    confirm: "Unban",
    done: "Account unbanned.",
  },
  purge: {
    title: "Delete permanently",
    text: "The account and all its data (profile, saved schemes, sessions, devices, notifications) are deleted now. This cannot be undone.",
    confirm: "Delete permanently",
    done: "Account deleted permanently.",
  },
};

const small = "px-3 py-1.5 text-xs";
const dangerSolid =
  "inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

export function UserModeration({ userId, name, email, banned, deleted }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<ModerationAction | null>(null);
  const [note, setNote] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [block, setBlock] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function choose(action: ModerationAction) {
    setOpen(action);
    setNote("");
    setConfirmEmail("");
    setBlock(true);
    setError(null);
    setDone(null);
  }

  function close() {
    if (!pending) setOpen(null);
  }

  function run() {
    if (!open) return;
    const action = open;
    setError(null);
    start(async () => {
      const res = await moderateUser({ userId, action, note, confirmEmail, block });
      if (!res.ok) return setError(res.error);
      setOpen(null);
      setDone(COPY[action].done);
      router.refresh();
    });
  }

  const severe = open === "purge" || open === "ban";
  const purgeReady =
    open !== "purge" || (email != null && confirmEmail.trim().toLowerCase() === email.trim().toLowerCase());

  const dialog = open && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(e) => e.target === e.currentTarget && close()}
      onKeyDown={(e) => e.key === "Escape" && close()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={COPY[open].title}
        className={`w-full max-w-md rounded-2xl border bg-white p-5 text-left text-sm shadow-xl ${
          severe ? "border-red-200" : "border-slate-200"
        }`}
      >
        <p className={`text-base font-semibold ${severe ? "text-red-700" : "text-slate-900"}`}>{COPY[open].title}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {name}
          {email ? ` · ${email}` : ""}
        </p>
        <p className={`mt-3 rounded-xl p-3 text-xs leading-relaxed ${severe ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900"}`}>
          {COPY[open].text}
        </p>
        {open === "purge" && (
          <>
            <label className="mt-3 block text-xs font-medium text-slate-700">
              Type the account email to confirm
              <input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={email ?? "this account has no email"}
                autoComplete="off"
                autoFocus
                className={`${field} mt-1`}
              />
            </label>
            <label className="mt-3 flex items-start gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="mt-0.5" />
              <span>Also block this Google account and email from signing up again</span>
            </label>
          </>
        )}
        {open !== "restore" && open !== "unban" && (
          <label className="mt-3 block text-xs font-medium text-slate-700">
            Note (optional, kept in the audit log{open === "ban" ? " and shown as the ban reason" : ""})
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className={`${field} mt-1`} />
          </label>
        )}
        {error && (
          <p role="alert" className="mt-3 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={btn.secondary} disabled={pending} onClick={close}>
            Cancel
          </button>
          <button type="button" className={severe ? dangerSolid : btn.primary} disabled={pending || !purgeReady} onClick={run}>
            {pending ? "Working…" : COPY[open].confirm}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-nowrap justify-end gap-1.5">
        {deleted ? (
          <button type="button" className={`${btn.secondary} ${small}`} onClick={() => choose("restore")}>
            <RotateCcw className="h-3.5 w-3.5" /> Restore
          </button>
        ) : (
          <button type="button" className={`${btn.secondary} ${small}`} onClick={() => choose("remove")}>
            <UserMinus className="h-3.5 w-3.5" /> Remove
          </button>
        )}
        {banned ? (
          <button type="button" className={`${btn.secondary} ${small}`} onClick={() => choose("unban")}>
            <ShieldCheck className="h-3.5 w-3.5" /> Unban
          </button>
        ) : (
          <button type="button" className={`${btn.danger} ${small}`} onClick={() => choose("ban")}>
            <Ban className="h-3.5 w-3.5" /> Ban
          </button>
        )}
        <button type="button" className={`${btn.danger} ${small}`} onClick={() => choose("purge")}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
      {done && !open && (
        <p role="status" className="text-xs font-medium text-emerald-700">
          {done}
        </p>
      )}
      {dialog && createPortal(dialog, document.body)}
    </div>
  );
}
