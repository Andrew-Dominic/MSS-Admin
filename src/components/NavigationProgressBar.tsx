'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// The bar starts on an internal link click and stops as soon as the route
// differs from the one it started on, so "done" is derived, never set in an effect.
export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [startedOn, setStartedOn] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const loading = startedOn !== null && startedOn === routeKey;

  // Intercept internal link clicks to start the bar immediately.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || target.getAttribute('target') === '_blank' || target.hasAttribute('download')) {
        return;
      }

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setStartedOn(`${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`);
      setProgress(30);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // While loading, creep towards 85% and give up after 8s if navigation stalls.
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setProgress((p) => Math.min(p + 15, 85)), 150);
    const safety = setTimeout(() => setStartedOn(null), 8000);
    return () => {
      clearInterval(interval);
      clearTimeout(safety);
    };
  }, [loading]);

  if (!loading) return null;

  return (
    <>
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-blue-400 via-blue-600 to-sky-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(37,99,235,0.55)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Floating Status Pill */}
      <div
        role="status"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2 bg-gray-900/90 text-white backdrop-blur-md rounded-full text-xs font-medium shadow-2xl border border-gray-800 animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span>Loading page...</span>
      </div>
    </>
  );
}
