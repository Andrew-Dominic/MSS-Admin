"use client";

import { useEffect, useState } from "react";
import { broadcastProgress } from "@/app/notifications/actions";
import { Notice, Panel } from "@/components/admin/ui";
import type { BroadcastProgress } from "@/lib/mss/types";

/** The API asks clients to poll no more often than every 5 seconds. */
const POLL_MS = 6_000;

const STATUS: Record<BroadcastProgress["status"], string> = {
  queued: "Queued",
  processing: "Delivering",
  completed: "Delivered",
  completed_with_errors: "Delivered with errors",
};

const done = (p: BroadcastProgress) => p.delivered + p.failed >= p.recipients;

/** Live inbox-delivery counters for one broadcast. */
export function BroadcastProgressCard({ broadcastId }: { broadcastId: string }) {
  const [progress, setProgress] = useState<BroadcastProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const res = await broadcastProgress(broadcastId);
      if (stopped) return;
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      setProgress(res.data);
      if (!done(res.data)) timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [broadcastId]);

  const pct = progress && progress.recipients > 0 ? Math.round(((progress.delivered + progress.failed) / progress.recipients) * 100) : 100;

  return (
    <Panel title="Broadcast delivery" actions={<span className="font-mono text-xs text-gray-400">{broadcastId.slice(0, 8)}</span>}>
      {error && <Notice tone="error">{error}</Notice>}
      {!progress && !error && <p className="text-sm text-gray-500">Loading…</p>}
      {progress && (
        <div className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold text-gray-900">{STATUS[progress.status]}</span>
            <span className="text-gray-600">
              {progress.delivered.toLocaleString("en-IN")} of {progress.recipients.toLocaleString("en-IN")} inboxes
              {progress.failed > 0 && ` · ${progress.failed} skipped (account deleted)`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-500">
            Counts inbox entries created. Phone notifications follow for users with a registered device and notifications turned on.
            {progress.status === "queued" && !done(progress) && " If this stays queued, the server's notification worker may be stopped."}
          </p>
        </div>
      )}
    </Panel>
  );
}
