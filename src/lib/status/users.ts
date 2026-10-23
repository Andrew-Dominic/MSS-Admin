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
}

export type UsersResult = { connected: true; total: number; items: AppUser[] } | { connected: false; error: string };

/** AGENT_URL points at the agent's /stats; /users lives next to it. */
function usersUrl(): string | null {
  const base = process.env.AGENT_URL;
  if (!base) return null;
  return /\/stats\/?$/.test(base) ? base.replace(/\/stats\/?$/, "/users") : `${base.replace(/\/$/, "")}/users`;
}

export async function listUsers(q: string, limit: number, offset: number): Promise<UsersResult> {
  const url = usersUrl();
  const token = process.env.AGENT_TOKEN;
  if (!url || !token) return { connected: false, error: "The server agent is not configured (AGENT_URL / AGENT_TOKEN)." };
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (q) params.set("q", q);
  try {
    const res = await fetch(`${url}?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return { connected: false, error: `The server agent answered HTTP ${res.status}.` };
    const body = (await res.json()) as { total?: number; items?: AppUser[] };
    return { connected: true, total: body.total ?? 0, items: Array.isArray(body.items) ? body.items : [] };
  } catch (e) {
    return { connected: false, error: `The server agent could not be reached (${(e as Error).name}).` };
  }
}
