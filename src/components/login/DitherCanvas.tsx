"use client";

import { useEffect, useRef } from "react";

/**
 * Animated halftone ("dither") panel for the sign-in page: a field of
 * diamonds whose size follows slowly drifting soft blobs, in MSS blues.
 * Static when the user prefers reduced motion; paused while the tab is hidden.
 */
export function DitherCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const CELL = 9; // grid pitch in CSS px
    // Light MSS blues only; diamonds never touch, so white always shows through.
    const COLORS = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb"];
    // Soft blobs: position (0..1), radius, drift speed and phase.
    const blobs = [
      { x: 0.72, y: 0.3, r: 0.42, sx: 0.07, sy: 0.05, p: 0 },
      { x: 0.86, y: 0.72, r: 0.38, sx: 0.05, sy: 0.08, p: 1.7 },
      { x: 0.55, y: 0.62, r: 0.3, sx: 0.09, sy: 0.06, p: 3.1 },
      { x: 0.95, y: 0.12, r: 0.28, sx: 0.06, sy: 0.04, p: 4.4 },
    ];

    let w = 0;
    let h = 0;
    // Pointer: diamonds swell and push outward around the cursor.
    const mouse = { x: -9999, y: -9999, strength: 0, target: 0 };
    let raf = 0;
    let last = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Cheap deterministic per-cell grain so the edge breaks up like a real dither.
    const grain = (i: number, j: number) => {
      const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / CELL) + 1;
      const rows = Math.ceil(h / CELL) + 1;
      const centres = blobs.map((b) => ({
        x: (b.x + Math.sin(t * b.sx + b.p) * 0.08) * w,
        y: (b.y + Math.cos(t * b.sy + b.p) * 0.08) * h,
        r: b.r * Math.min(Math.max(w, h), 900),
      }));
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * CELL + (j % 2 ? CELL / 2 : 0);
          const y = j * CELL;
          let v = 0;
          for (const c of centres) {
            const dx = x - c.x;
            const dy = y - c.y;
            v += Math.exp(-(dx * dx + dy * dy) / (c.r * c.r));
          }
          v *= 0.62; // overall density: airy, not solid
          // Fade towards the left edge so the form side stays clean.
          v *= Math.min(1, Math.max(0, (x / w - 0.12) * 1.6));
          v += (grain(i, j) - 0.5) * 0.35;
          let px = x;
          let py = y;
          if (mouse.strength > 0.01) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const d2 = dx * dx + dy * dy;
            const R = 110;
            const fall = Math.exp(-d2 / (R * R)) * mouse.strength;
            // Ripple ring travelling outwards from the cursor.
            const ring = Math.sin(Math.sqrt(d2) / 14 - t * 6) * 0.5 + 0.5;
            v += fall * (0.55 + ring * 0.4);
            const d = Math.sqrt(d2) || 1;
            px += (dx / d) * fall * 5;
            py += (dy / d) * fall * 5;
          }
          if (v < 0.18) continue;
          const size = Math.min(1, v) * CELL * 0.44; // < half the pitch: dots stay separate
          ctx.fillStyle = COLORS[Math.min(COLORS.length - 1, Math.floor(Math.min(1, v) * COLORS.length))];
          ctx.beginPath();
          ctx.moveTo(px, py - size);
          ctx.lineTo(px + size, py);
          ctx.lineTo(px, py + size);
          ctx.lineTo(px - size, py);
          ctx.closePath();
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / 24) return; // ~24 fps is plenty for a slow drift
      last = now;
      mouse.strength += (mouse.target - mouse.strength) * 0.15;
      draw(now / 1000);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now() / 1000);
    });
    ro.observe(canvas);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.target = 1;
      if (reduce) {
        mouse.strength = 1;
        draw(0);
      }
    };
    const onLeave = () => {
      mouse.target = 0;
      if (reduce) {
        mouse.strength = 0;
        draw(0);
      }
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    if (reduce) draw(0);
    else raf = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`h-full w-full ${className}`} />;
}
