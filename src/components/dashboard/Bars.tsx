/** Vertical bar chart drawn with CSS. Bars grow in on load (mss-grow). */
export function Bars({
  data,
  height = 160,
  highlightLast = true,
  tone = "light",
  showLabels = true,
}: {
  data: { label: string; value: number; title?: string }[];
  height?: number;
  highlightLast?: boolean;
  tone?: "light" | "dark";
  showLabels?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const base = tone === "dark" ? "bg-white/25" : "bg-slate-200";
  const strong = tone === "dark" ? "bg-[var(--mss-saffron)]" : "bg-blue-600";
  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }} role="img" aria-label={data.map((d) => `${d.title ?? d.label}: ${d.value}`).join(", ")}>
        {data.map((d, i) => {
          const last = highlightLast && i === data.length - 1;
          const pct = d.value === 0 ? 3 : Math.max(8, (d.value / max) * 100);
          return (
            <div key={i} className="group relative flex h-full flex-1 items-end" title={`${d.title ?? d.label}: ${d.value}`}>
              <div
                className={`mss-grow w-full rounded-t-md transition-colors ${last || d.value === max ? strong : base} group-hover:bg-blue-500`}
                style={{ height: `${pct}%`, animationDelay: `${i * 35}ms` }}
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="mt-2 flex gap-1.5">
          {data.map((d, i) => (
            <span key={i} className={`flex-1 text-center text-[10px] ${tone === "dark" ? "text-blue-100/60" : "text-slate-400"}`}>
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
