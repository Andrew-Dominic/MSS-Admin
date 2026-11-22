"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

/** Re-renders the server page every [seconds] while visible, with a manual refresh button. */
export function AutoRefresh({ seconds = 60, generatedAt }: { seconds?: number; generatedAt: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ago, setAgo] = useState(0);

  useEffect(() => {
    const born = Date.parse(generatedAt);
    const tick = setInterval(() => {
      if (document.hidden) return;
      const age = Math.round((Date.now() - born) / 1000);
      setAgo(age);
      if (age >= seconds) start(() => router.refresh());
    }, 1000);
    return () => clearInterval(tick);
  }, [generatedAt, seconds, router]);

  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Refreshing…" : `Updated ${ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m`} ago`}
    </button>
  );
}
