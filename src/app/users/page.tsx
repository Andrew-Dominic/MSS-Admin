import Link from "next/link";
import { Bell, Search, UserX } from "lucide-react";
import { Notice, PageHeader, btn, field, formatDate } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/CopyButton";
import { listUsers, type AppUser, type UserStatus } from "@/lib/status/users";
import { STATES } from "@/lib/mss/types";

export const dynamic = "force-dynamic";

const PAGE = 25;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function initials(u: AppUser): string {
  const n = (u.name || u.profile_name || u.email?.split("@")[0] || "?").trim();
  return n.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

const stateName = (s: string | null) => (s ? STATES.find((x) => x.code === s.toLowerCase())?.name ?? s : null);
const LANG: Record<string, string> = { en: "English", hi: "Hindi", ta: "Tamil", mr: "Marathi" };

function Badge({ tone, children }: { tone: "green" | "amber" | "blue" | "red"; children: React.ReactNode }) {
  const style = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    red: "bg-red-50 text-red-700 ring-red-200",
  }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style}`}>{children}</span>;
}

const STATUS_TABS: { value: UserStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "deleted", label: "Deleted" },
];

/** Whole days until [iso], never negative. */
function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 86_400_000)) : null;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[]; status?: string | string[] }>;
}) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const status: UserStatus = (["active", "deleted"] as const).find((s) => s === one(sp.status)) ?? "all";
  const result = await listUsers(q, PAGE, (page - 1) * PAGE, status);
  const pages = result.connected ? Math.max(1, Math.ceil(result.total / PAGE)) : 1;
  const query = (extra: Record<string, string>) =>
    `/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(status !== "all" ? { status } : {}), ...extra })}`;
  const link = (p: number) => query({ page: String(p) });
  const noun = status === "deleted" ? "deleted" : status === "active" ? "active" : q ? "matching" : "registered";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Users"
        description={result.connected ? `${result.total} ${noun} app user(s). Read from the API server's database.` : "People who use the MSS app."}
      />

      {result.connected && result.deletedSupported && (
        <nav aria-label="Filter users" className="mss-fade-up mb-4 flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => {
            const on = t.value === status;
            const href = `/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(t.value !== "all" ? { status: t.value } : {}) })}`;
            return (
              <Link
                key={t.value}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-inset transition-colors ${
                  on ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}
                {t.value === "deleted" && result.deletedTotal != null && <span className="ml-1.5 opacity-70">{result.deletedTotal}</span>}
              </Link>
            );
          })}
        </nav>
      )}

      <form method="get" action="/users" className="mss-fade-up mb-4 flex gap-2 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <label className="relative block flex-1">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input name="q" defaultValue={q} placeholder="Search by name, email or user ID" className={`${field} pl-9`} />
        </label>
        <button type="submit" className={btn.primary}>Search</button>
        {q && <Link href="/users" className={btn.secondary}>Clear</Link>}
      </form>

      {!result.connected ? (
        <Notice tone="warn">
          The server agent isn&apos;t connected, so users can&apos;t be listed right now. {result.error} Check the agent on the API host
          (see <Link href="/status" className="font-semibold underline">System</Link>).
        </Notice>
      ) : (
        <>
          <div className="mss-fade-up overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Joined / last login</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3 text-center">Sessions</th>
                  <th className="px-4 py-3 text-center">Push devices</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((u) => {
                  const admin = (u.roles ?? []).includes("admin");
                  const deleted = Boolean(u.deleted_at);
                  const left = daysLeft(u.purge_after);
                  return (
                    <tr key={u.id} className={`align-top ${deleted ? "bg-red-50/40 text-slate-500" : "hover:bg-blue-50/30"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          {u.picture_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- external avatars, no optimizer on the server
                            <img src={u.picture_url} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{initials(u)}</span>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{u.name || u.profile_name || "—"}</span>
                              {admin && <Badge tone="blue">Admin</Badge>}
                              {deleted && <Badge tone="red">Deleted</Badge>}
                              {!deleted && u.restored_at && <Badge tone="green">Reactivated</Badge>}
                            </div>
                            {deleted && (
                              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
                                <UserX className="h-3.5 w-3.5" />
                                Deleted {formatDate(u.deleted_at ?? null)} · data removed {formatDate(u.purge_after ?? null)}
                                {left != null && ` (${left} day${left === 1 ? "" : "s"} left)`}
                              </div>
                            )}
                            {!deleted && u.restored_at && <div className="text-xs text-emerald-700">Reactivated {formatDate(u.restored_at)}</div>}
                            {u.profile_name && u.profile_name !== u.name && <div className="text-xs text-slate-500">Profile: {u.profile_name}</div>}
                            <div className="text-xs text-slate-500">{u.email ?? "no email"}</div>
                            <CopyButton value={u.id} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>{formatDate(u.created_at)}</div>
                        <div className="text-slate-400">Last: {formatDate(u.last_login_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{stateName(u.state) ?? "—"}</div>
                        {u.district && <div className="text-xs text-slate-400">{u.district}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {u.is_profile_complete ? <Badge tone="green">Complete</Badge> : <Badge tone="amber">Incomplete</Badge>}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {[u.language ? LANG[u.language] ?? u.language : null, u.applicant_type?.replace(/_/g, " ")].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">{u.sessions ?? "—"}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{u.devices ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {deleted ? (
                            <span className="text-xs text-slate-400">Signed out · can reactivate by signing in</span>
                          ) : (
                            <Link href={`/notifications?user=${encodeURIComponent(u.id)}`} className={`${btn.secondary} px-3 py-1.5 text-xs`}>
                              <Bell className="h-3.5 w-3.5" /> Notify
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!result.items.length && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">{status === "deleted" ? "No deleted accounts waiting to be removed." : q ? "No users match this search." : "No users yet."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>Page {Math.min(page, pages)} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 ? <Link href={link(page - 1)} className={btn.secondary}>Previous</Link> : <span className={`${btn.secondary} opacity-50`}>Previous</span>}
              {page < pages ? <Link href={link(page + 1)} className={btn.secondary}>Next</Link> : <span className={`${btn.secondary} opacity-50`}>Next</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
