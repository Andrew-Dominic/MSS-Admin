"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare Turnstile box. Renders inside the sign-in form; Turnstile adds a
 * hidden `cf-turnstile-response` input that the login action verifies.
 */
export function TurnstileWidget({ siteKey, action }: { siteKey: string; action: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id: string | null = null;
    const render = () => {
      if (!ref.current || !window.turnstile || id) return;
      id = window.turnstile.render(ref.current, { sitekey: siteKey, action, theme: "light", size: "flexible" });
    };
    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }
    return () => {
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey, action]);

  return <div ref={ref} className="min-h-[65px]" />;
}
