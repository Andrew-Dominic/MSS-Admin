'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or search params change, complete the loading animation
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept link clicks to trigger the loading bar immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || target.getAttribute('target') === '_blank') {
        return;
      }

      // If clicking the current path without query change, skip
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      // Start loading
      setLoading(true);
      setProgress(30);

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 15;
        });
      }, 150);

      // Failsafe cleanup if navigation stalls
      const safetyTimer = setTimeout(() => {
        clearInterval(progressInterval);
        setLoading(false);
        setProgress(0);
      }, 8000);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(safetyTimer);
      };
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (!loading) return null;

  return (
    <>
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(249,115,22,0.6)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Floating Status Pill */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2 bg-gray-900/90 text-white backdrop-blur-md rounded-full text-xs font-medium shadow-2xl border border-gray-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        <span>Loading page...</span>
      </div>
    </>
  );
}
