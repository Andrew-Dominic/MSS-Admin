import Link from "next/link";
import { PageHeader, Notice, Panel, btn, field } from "@/components/admin/ui";
import { describeError } from "@/lib/mss/api";
import {
  FILTER_OPTIONS,
  REPORTS,
  getUsageReport,
  getUsageStatus,
  type FilterKey,
  type Filters,
  type Report,
  type UsageReport,
  type UsageRow,
  type UsageStatus,
} from "@/lib/mss/usage";

export const dynamic = "force-dynamic";

const REPORT_LABELS: Record<Report, { label: string; about: string }> = {
  reach: { label: "Reach", about: "Active installs, sessions, returning installs and which parts of the app are opened." },
  search: { label: "Search", about: "How people search, how often nothing is found, and whether a result is opened." },
  schemes: { label: "Schemes", about: "Which schemes are opened, from where, and how often the apply link is used." },
  assessment: { label: "Questionnaire", about: "Starts, completions, where people stop, and the results they see." },
  profile: { label: "Profile & sign-in", about: "Profile progress, sign-in prompts and guests who create an account." },
};

const METRICS: Record<string, string> = {
  active_installs: "Active installs",
  sessions: "Sessions",
  sessions_per_install: "Sessions per install",
  returning_installs: "Returning installs",
  feature_opens: "Screens opened",
  events: "Events received",
  searches: "Searches",
  zero_result_rate: "Searches with no results",
  search_to_detail_rate: "Searches that led to a scheme",
  searches_opened: "Searches opened, by result position",
  filter_changes: "Filter changes",
  scheme_opens: "Scheme pages opened",
  scheme_actions: "Scheme actions",
  apply_link_opens: "Apply links opened",
  detail_to_apply_rate: "Scheme pages that led to the apply link",
  starts: "Questionnaires started",
  completions: "Questionnaires completed",
  abandons: "Questionnaires abandoned",
  completion_rate: "Completion rate",
  field_events: "Question events",
  results_shown: "Results shown",
  median_viable_results: "Median good + possible results",
  zero_viable_results: "Results with no good or possible scheme",
  no_good_fit: "Results with no good fit",
  profile_events: "Profile events",
  profile_completions: "Profiles completed",
  profile_completion_rate: "Profile completion rate",
  sign_in_prompts: "Sign-in prompts",
  sign_ins: "Sign-ins",
  guest_to_account_rate: "Guests who signed in",
};

const DIMENSIONS: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  user_kind: "User type",
  language: "Language",
  mode: "Mode",
  platform: "Platform",
  feature: "Screen",
  app_version: "App version",
  notice_version: "Notice version",
  schema_version: "Schema version",
  source: "Source",
  result_count: "Results",
  topic_key: "Topic",
  first_rank: "Result position",
  filter_key: "Filter",
  entry_point: "Opened from",
  scheme_id: "Scheme",
  action: "Action",
  field_id: "Question",
  fit: "Fit",
  section: "Section",
  from_guest: "From guest",
};

const VALUE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  mr: "Marathi",
  guest: "Guest",
  signed_in: "Signed in",
  regular: "Regular",
  companion: "Companion",
  android: "Android",
  ios: "iOS",
  web: "Web",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  true: "Yes",
  false: "No",
};

const FILTER_LABELS: Record<FilterKey, string> = {
  platform: "Platform",
  language: "Language",
  mode: "Mode",
  user_kind: "User type",
  app_version: "App version",
};

const TIME_DIMS = new Set(["day", "week", "month"]);
const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const label = (map: Record<string, string>, key: string) => map[key] ?? key.replace(/_/g, " ");

/** Today and N days back, as India-time calendar dates (YYYY-MM-DD). */
function indiaDay(offsetDays = 0): string {
  const d = new Date(Date.now() + 5.5 * 3600_000 - offsetDays * 86400_000);
  return d.toISOString().slice(0, 10);
}
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRatio(row: UsageRow) {
  return row.denominator !== undefined;
}

function Value({ row, large }: { row: UsageRow; large?: boolean }) {
  if (row.status === "suppressed")
    return <span className="text-slate-400" title="Fewer installs than the privacy minimum, so this number is withheld.">Hidden</span>;
  if (row.status === "unavailable")
    return <span className="text-slate-400" title="No events of this kind arrived in this date range. This is not a measured zero.">No data</span>;
  // Rates are shares (shown as %); other ratios, like sessions per install, are plain averages.
  const text =
    isRatio(row) && row.metric.endsWith("_rate") ? `${Math.round((row.value ?? 0) * 1000) / 10}%` : nf.format(row.value ?? 0);
  return (
    <span className={large ? "" : "tabular-nums"}>
      {text}
      {isRatio(row) && (
        <span className="ml-1 text-xs font-normal text-slate-400">
          ({nf.format(row.numerator ?? 0)} / {nf.format(row.denominator ?? 0)})
        </span>
      )}
    </span>
  );
}

function Total({ row }: { row: UsageRow }) {
  return (
    <div className="mss-fade-up rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label(METRICS, row.metric)}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">
        <Value row={row} large />
      </p>
      {row.status === "available" && row.sample_size !== undefined && (
        <p className="mt-1 text-xs text-slate-500">from {nf.format(row.sample_size)} installs</p>
      )}
    </div>
  );
}

function Breakdown({ title, keys, rows }: { title: string; keys: string[]; rows: UsageRow[] }) {
  const time = keys.length === 1 && TIME_DIMS.has(keys[0]);
  const sorted = [...rows].sort((a, b) => {
    if (time) return a.dimensions[keys[0]].localeCompare(b.dimensions[keys[0]]);
    return (b.value ?? -1) - (a.value ?? -1);
  });
  const max = Math.max(1, ...rows.map((r) => (r.status === "available" && !isRatio(r) ? r.value ?? 0 : 0)));
  return (
    <Panel title={title}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {keys.map((k) => (
                <th key={k} className="py-2 pr-4">{label(DIMENSIONS, k)}</th>
              ))}
              <th className="py-2 pr-4 text-right">Value</th>
              <th className="hidden w-1/3 py-2 sm:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((r) => (
              <tr key={keys.map((k) => r.dimensions[k]).join("|")}>
                {keys.map((k) => (
                  <td key={k} className="py-2 pr-4 text-slate-800">{label(VALUE_LABELS, String(r.dimensions[k]))}</td>
                ))}
                <td className="py-2 pr-4 text-right"><Value row={r} /></td>
                <td className="hidden py-2 sm:table-cell">
                  {r.status === "available" && !isRatio(r) && (
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${((r.value ?? 0) / max) * 100}%` }} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReportView({ data }: { data: UsageReport }) {
  const totals = data.rows.filter((r) => Object.keys(r.dimensions).length === 0);
  const groups = new Map<string, { keys: string[]; metric: string; rows: UsageRow[] }>();
  for (const r of data.rows) {
    const keys = Object.keys(r.dimensions);
    if (!keys.length) continue;
    const id = `${r.metric}|${keys.join(",")}`;
    if (!groups.has(id)) groups.set(id, { keys, metric: r.metric, rows: [] });
    groups.get(id)!.rows.push(r);
  }
  return (
    <>
      {totals.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {totals.map((r) => (
            <Total key={r.metric} row={r} />
          ))}
        </div>
      )}
      {data.rows.length === 0 && <Notice tone="info">No events in this date range.</Notice>}
      <div className="grid gap-5 lg:grid-cols-2">
        {[...groups.values()].map((g) => (
          <Breakdown
            key={`${g.metric}|${g.keys.join(",")}`}
            title={`${label(METRICS, g.metric)} by ${g.keys.map((k) => label(DIMENSIONS, k).toLowerCase()).join(" and ")}`}
            keys={g.keys}
            rows={g.rows}
          />
        ))}
      </div>
    </>
  );
}

type Search = Partial<Record<"report" | "from" | "to" | FilterKey, string>>;

export default async function UsagePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const report: Report = (REPORTS as readonly string[]).includes(sp.report ?? "") ? (sp.report as Report) : "reach";
  const to = sp.to && DATE.test(sp.to) ? sp.to : indiaDay(0);
  const from = sp.from && DATE.test(sp.from) ? sp.from : indiaDay(29);
  const filters: Filters = {};
  for (const [k, values] of Object.entries(FILTER_OPTIONS))
    if (sp[k as FilterKey] && (values as readonly string[]).includes(sp[k as FilterKey]!)) filters[k as FilterKey] = sp[k as FilterKey];
  if (sp.app_version && /^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$/.test(sp.app_version)) filters.app_version = sp.app_version;

  let status: UsageStatus | null = null;
  let data: UsageReport | null = null;
  let error: string | null = null;
  try {
    status = await getUsageStatus();
    if (status && status.events > 0) data = await getUsageReport(report, from, to, filters);
  } catch (e) {
    error = describeError(e);
  }

  const query = (over: Record<string, string>) => {
    const q = new URLSearchParams({ report, from, to, ...filters, ...over });
    return `/usage?${q}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="App usage"
        description="How the app is used, from anonymous install and session counts. No names, emails, phone numbers or search text are collected. Small groups are hidden to protect privacy. Dates are India time."
      />

      {error ? (
        <Notice tone="error">{error}</Notice>
      ) : !status ? (
        <Notice tone="info">
          Awaiting instrumentation. The server does not have app usage analytics yet. This page fills in once the
          analytics update is installed on the API and the app starts sending events.
        </Notice>
      ) : status.events === 0 ? (
        <Notice tone="info">
          Awaiting instrumentation. The server is ready, but no app has sent usage events yet. Events are accepted only
          after an analytics notice version is published.
        </Notice>
      ) : null}

      {status && status.events > 0 && (
        <>
          <nav className="flex flex-wrap gap-2" aria-label="Report">
            {REPORTS.map((r) => (
              <Link
                key={r}
                href={query({ report: r })}
                aria-current={r === report ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors ${
                  r === report ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {REPORT_LABELS[r].label}
              </Link>
            ))}
          </nav>

          <form method="get" action="/usage" className="flex flex-wrap items-end gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
            <input type="hidden" name="report" value={report} />
            <label className="text-xs font-medium text-slate-600">
              From
              <input type="date" name="from" defaultValue={from} className={`${field} mt-1 block`} />
            </label>
            <label className="text-xs font-medium text-slate-600">
              To
              <input type="date" name="to" defaultValue={to} className={`${field} mt-1 block`} />
            </label>
            {(Object.keys(FILTER_OPTIONS) as (keyof typeof FILTER_OPTIONS)[]).map((k) => (
              <label key={k} className="text-xs font-medium text-slate-600">
                {FILTER_LABELS[k]}
                <select name={k} defaultValue={filters[k] ?? ""} className={`${field} mt-1 block`}>
                  <option value="">All</option>
                  {FILTER_OPTIONS[k].map((v) => (
                    <option key={v} value={v}>{label(VALUE_LABELS, v)}</option>
                  ))}
                </select>
              </label>
            ))}
            <label className="text-xs font-medium text-slate-600">
              App version
              <input name="app_version" defaultValue={filters.app_version ?? ""} placeholder="All" className={`${field} mt-1 block w-28`} />
            </label>
            <button type="submit" className={btn.primary}>Apply</button>
            <Link href={`/usage?report=${report}`} className={btn.secondary}>Reset</Link>
          </form>

          <p className="text-sm text-slate-600">{REPORT_LABELS[report].about}</p>
          {data && <ReportView data={data} />}

          <p className="text-xs text-slate-400">
            {nf.format(status.events)} events stored (kept 90 days)
            {status.first_event_day && ` · ${status.first_event_day} to ${status.last_event_day}`}
            {status.data_through && ` · data through ${new Date(status.data_through).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`}
            {` · groups under ${status.min_installs} installs are hidden`}
          </p>
        </>
      )}
    </div>
  );
}
