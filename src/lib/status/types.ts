// System status data (merged from the MSS Status dashboard).

export type Level = "ok" | "warn" | "fail" | "off";

export interface Check {
  id: string;
  group: string;
  name: string;
  level: Level;
  detail: string;
  ms?: number;
}

export interface Tile {
  label: string;
  value: string;
  level: Level;
  hint?: string;
}

export interface GithubData {
  connected: boolean;
  error?: string;
  repo: string;
  releases: { tag: string; name: string; published: string; prerelease: boolean; apk?: string; downloads: number; url: string }[];
  runs: { name: string; branch: string; status: string; conclusion: string | null; created: string; url: string }[];
  issues: { number: number; title: string; created: string; url: string }[];
  pulls: { number: number; title: string; author: string; created: string; url: string }[];
}

export interface AgentData {
  connected: boolean;
  error?: string;
  generatedAt?: string;
  host?: { hostname: string; uptimeSec: number; load: number[]; cpus: number; memTotal: number; memFree: number; disk?: { total: number; used: number; mount: string } };
  service?: { name: string; active: string; since?: string; restarts?: number };
  /** PM2 processes on the API server (agent PM2 mode). */
  services?: { name: string; active: string; since?: string; restarts?: number; version?: string; memory?: number; cpu?: number }[];
  db?: {
    ok: boolean;
    error?: string;
    version?: string;
    sizeBytes?: number;
    connections?: number;
    startedAt?: string;
    tables?: { name: string; rows: number }[];
  };
  users?: Record<string, number | null>;
  logs?: { source: string; errors24h: number | null; lines: { time: string; level: string; text: string }[]; error?: string };
}

export interface StatusPayload {
  generatedAt: string;
  apiBase: string;
  apiVersion?: string;
  tiles: Tile[];
  checks: Check[];
  github: GithubData;
  agent: AgentData;
}
