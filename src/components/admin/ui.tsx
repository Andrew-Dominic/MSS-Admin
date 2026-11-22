import type { ReactNode } from "react";
import type { DraftAction, DraftStatus } from "@/lib/mss/types";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mss-fade-up mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<DraftStatus, string> = {
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-blue-50 text-blue-700 ring-blue-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  discarded: "bg-gray-100 text-gray-500 ring-gray-200",
};

export function StatusBadge({ status, action }: { status: DraftStatus; action?: DraftAction }) {
  const label = action === "withdraw" ? `${status} · withdrawal` : status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${STATUS_STYLE[status] ?? STATUS_STYLE.draft}`}>
      {label}
    </span>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const style = {
    info: "bg-blue-50 text-blue-800 border-blue-100",
    warn: "bg-amber-50 text-amber-800 border-amber-100",
    error: "bg-red-50 text-red-700 border-red-100",
    success: "bg-emerald-50 text-emerald-800 border-emerald-100",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${style}`}>
      {children}
    </div>
  );
}

export function Panel({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mss-fade-up rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50",
};

export const field =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200";

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  // Fixed zone: the server (UTC) and the browser must render the same text,
  // or React reports a hydration mismatch and times disagree between pages.
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}

/**
 * In-page "are you sure?" step. Native confirm() dialogs are suppressed by
 * some browsers and embedded views, where the action then silently did nothing.
 */
export function ConfirmBar({
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  pending = false,
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  return (
    <div role="alertdialog" aria-live="assertive" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">{children}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn.primary} disabled={pending} onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className={btn.secondary} disabled={pending} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
