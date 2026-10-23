"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Shows a value in monospace; clicking copies it to the clipboard. */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure context): the text is still selectable.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : "Copy"}
      aria-label={`Copy ${value}`}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-lg px-1.5 py-0.5 font-mono text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    >
      <span className="truncate">{label ?? value}</span>
      {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100" />}
    </button>
  );
}
