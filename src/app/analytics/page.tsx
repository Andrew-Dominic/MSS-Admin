import Link from "next/link";
import { PageHeader, Notice, Panel } from "@/components/admin/ui";
import { Bars } from "@/components/dashboard/Bars";
import { describeError } from "@/lib/mss/api";
import { getQuestionnaireStats, type QuestionnaireStats } from "@/lib/mss/questionnaire-stats";
import catalog from "@/lib/mss/questionnaire.json";

export const dynamic = "force-dynamic";

// The two states the project covers, and the views the page offers.
const TN = "tamil_nadu";
const MH = "maharashtra";
const SCOPES: { id: string; label: string; states?: string[] }[] = [
  { id: "all", label: "All users" },
  { id: "both", label: "Tamil Nadu + Maharashtra", states: [TN, MH] },
  { id: "tn", label: "Tamil Nadu", states: [TN] },
  { id: "mh", label: "Maharashtra", states: [MH] },
];

interface Option { value: string; en: string }
interface Field { id: string; type: string; question: { en: string }; options?: Option[] }
const fields = catalog.fields as unknown as Field[];
const byId = new Map(fields.map((f) => [f.id, f]));
const stateName = (key: string) => byId.get("business_state")?.options?.find((o) => o.value === key)?.en ?? key;

// Questions shown as breakdowns, in reading order (free text and numbers are handled separately).
const SECTIONS: { title: string; ids: string[] }[] = [
  { title: "Who is applying", ids: ["gender", "age_band", "social_category", "education"] },
  { title: "Where", ids: ["area_type", "special_zone", "home_state"] },
  { title: "The business", ids: ["nature", "business_age", "org_structure", "registrations", "machinery", "gi_tag", "cluster", "export"] },
  { title: "What they need", ids: ["goals", "help_needed"] },
  { title: "Skills and readiness", ids: ["digital", "tax", "prior_subsidy", "own_money"] },
];

const nf = new Intl.NumberFormat("en-IN");

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="mss-fade-up rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{typeof value === "number" ? nf.format(value) : value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** One horizontal bar per answer, with the count and the share of everyone in this view. */
function Breakdown({ id, counts, total }: { id: string; counts: Record<string, number>; total: number }) {
  const f = byId.get(id);
  if (!f) return null;
  const rows = (f.options ?? []).map((o) => ({ label: o.en, n: counts[o.value] ?? 0 }));
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">{f.question.en}</h3>
      {rows.every((r) => r.n === 0) ? (
        <p className="text-xs text-slate-400">No answers yet.</p>
      ) : (
        rows
          .filter((r) => r.n > 0 || rows.length <= 8)
          .sort((a, b) => (id === "home_state" || id === "business_state" ? b.n - a.n : 0))
          .slice(0, id === "home_state" ? 12 : 99)
          .map((r) => (
            <div key={r.label} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-700">{r.label}</span>
                <span className="tabular-nums text-slate-600">
                  {nf.format(r.n)} <span className="text-slate-400">({total ? Math.round((r.n / total) * 100) : 0}%)</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${(r.n / max) * 100}%` }} />
              </div>
            </div>
          ))
      )}
    </div>
  );
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope: raw } = await searchParams;
  const scope = SCOPES.find((s) => s.id === raw) ?? SCOPES[0];
  let stats: QuestionnaireStats | null = null;
  let error: string | null = null;
  try {
    stats = await getQuestionnaireStats(scope.states);
  } catch (e) {
    error = describeError(e);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Analytics"
        description="What users told us in the profile questionnaire, as totals. Pick all users, one state, or both states together. Guests who have not signed in are included. The state is the one chosen as the business location."
      />
      <nav className="flex flex-wrap gap-2" aria-label="View">
        {SCOPES.map((s) => (
          <Link
            key={s.id}
            href={s.id === "all" ? "/analytics" : `/analytics?scope=${s.id}`}
            aria-current={s.id === scope.id ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors ${
              s.id === scope.id ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      {error || !stats ? (
        <Notice tone="error">{error ?? "No data."}</Notice>
      ) : (
        <>
          {stats.total === 0 && <Notice tone="info">No answers in this view yet.</Notice>}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat label="People" value={stats.total} hint={scope.label} />
            <Stat label="Signed in" value={stats.signed_in} />
            <Stat label="Guests" value={stats.guests} />
            <Stat label="Answered all required" value={stats.completed} hint={stats.total ? `${Math.round((stats.completed / stats.total) * 100)}% of people` : undefined} />
            <Stat label="Shared location" value={stats.with_location} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="People by state of business">
              <div className="space-y-2">
                {stats.by_state.length === 0 && <p className="text-sm text-slate-500">No answers yet.</p>}
                {stats.by_state.slice(0, 12).map((s) => {
                  const max = Math.max(1, ...stats!.by_state.map((x) => x.count));
                  return (
                    <div key={s.state} className="text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-700">{stateName(s.state)}</span>
                        <span className="tabular-nums text-slate-600">{nf.format(s.count)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div className={`h-2 rounded-full ${s.state === TN || s.state === MH ? "bg-emerald-600" : "bg-slate-400"}`} style={{ width: `${(s.count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-500">This list ignores the view above so the states can be compared. Green are Tamil Nadu and Maharashtra.</p>
            </Panel>
            <Panel title="New answers, last 30 days">
              <Bars
                data={stats.daily.map((d) => ({ label: d.day.slice(8), value: d.count, title: d.day }))}
                height={140}
              />
              <p className="mt-3 text-xs text-slate-500">
                By source: {Object.entries(stats.by_source).map(([k, v]) => `${k === "app" ? "App" : "Website"} ${nf.format(v)}`).join(" · ") || "none yet"}
              </p>
            </Panel>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Stat label="Businesses with staff counts" value={stats.employees.businesses} />
            <Stat label="Total staff" value={stats.employees.total_staff} />
            <Stat label="Women staff" value={stats.employees.women_staff} hint={stats.employees.total_staff ? `${Math.round((stats.employees.women_staff / stats.employees.total_staff) * 100)}% of staff` : undefined} />
          </div>

          {SECTIONS.map((section) => (
            <Panel key={section.title} title={section.title}>
              <div className="grid gap-6 md:grid-cols-2">
                {section.ids.map((id) => (
                  <Breakdown key={id} id={id} counts={stats!.fields[id] ?? {}} total={stats!.total} />
                ))}
              </div>
            </Panel>
          ))}

          <Panel title="Top districts">
            {stats.by_district.length === 0 ? (
              <p className="text-sm text-slate-500">No districts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="py-2 pr-4">District</th><th className="py-2 pr-4">State</th><th className="py-2 text-right">People</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.by_district.slice(0, 25).map((d) => (
                      <tr key={`${d.state}/${d.district}`}>
                        <td className="py-2 pr-4 text-slate-800">{titleCase(d.district)}</td>
                        <td className="py-2 pr-4 text-slate-600">{stateName(d.state)}</td>
                        <td className="py-2 text-right tabular-nums">{nf.format(d.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <p className="text-xs text-slate-400">Updated {new Date(stats.generated_at).toLocaleString("en-IN")}</p>
        </>
      )}
    </div>
  );
}
