import "server-only";

// App users, read through the server agent on the API host (GET /users).
// The agent token stays on the server; nothing here reaches the browser.

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  picture_url: string | null;
  created_at: string | null;
  last_login_at: string | null;
  roles: string[] | null;
  profile_name: string | null;
  state: string | null;
  district: string | null;
  language: string | null;
  applicant_type: string | null;
  is_profile_complete: boolean | null;
  notifications: number | null;
  sessions: number | null;
  devices: number | null;
  /** Set while the user has deleted their account in the app (kept 30 days). */
  deleted_at?: string | null;
  /** When the deleted account and its data are removed for good. */
  purge_after?: string | null;
  /** Last time the user reactivated a deleted account. */
  restored_at?: string | null;
}

export type UserStatus = "all" | "active" | "deleted";

export type UsersResult =
  | {
      connected: true;
      total: number;
      items: AppUser[];
      /** False until the agent can read deleted accounts (API migration 021 + grant). */
      deletedSupported: boolean;
      deletedTotal: number | null;
    }
  | { connected: false; error: string };

/** AGENT_URL points at the agent's /stats; /users lives next to it. */
function usersUrl(): string | null {
  const base = process.env.AGENT_URL;
  if (!base) return null;
  return /\/stats\/?$/.test(base) ? base.replace(/\/stats\/?$/, "/users") : `${base.replace(/\/$/, "")}/users`;
}

export async function listUsers(q: string, limit: number, offset: number, status: UserStatus = "all"): Promise<UsersResult> {
  const url = usersUrl();
  const token = process.env.AGENT_TOKEN;
  if (!url || !token) return { connected: false, error: "The server agent is not configured (AGENT_URL / AGENT_TOKEN)." };
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  try {
    const res = await fetch(`${url}?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return { connected: false, error: `The server agent answered HTTP ${res.status}.` };
    const body = (await res.json()) as { total?: number; items?: AppUser[]; deleted_supported?: boolean; deleted_total?: number | null };
    return {
      connected: true,
      total: body.total ?? 0,
      items: Array.isArray(body.items) ? body.items : [],
      deletedSupported: body.deleted_supported === true,
      deletedTotal: body.deleted_total ?? null,
    };
  } catch (e) {
    return { connected: false, error: `The server agent could not be reached (${(e as Error).name}).` };
  }
}
