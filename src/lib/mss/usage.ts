import "server-only";
import { MssApiError, mssApi } from "./api";

/** App usage analytics (contract: mobile-analytics-api.md / analytics-admin-integration.md). Aggregates only. */
export const REPORTS = ["reach", "search", "schemes", "assessment", "profile"] as const;
export type Report = (typeof REPORTS)[number];

export const FILTER_OPTIONS = {
  platform: ["android", "ios", "web", "windows", "macos", "linux"],
  language: ["en", "hi", "ta", "mr"],
  mode: ["regular", "companion"],
  user_kind: ["guest", "signed_in"],
} as const;
export type FilterKey = keyof typeof FILTER_OPTIONS | "app_version";
export type Filters = Partial<Record<FilterKey, string>>;

export interface UsageStatus {
  events: number;
  data_through: string | null;
  first_event_day: string | null;
  last_event_day: string | null;
  timezone: string;
  min_installs: number;
}

export interface UsageRow {
  dimensions: Record<string, string>;
  metric: string;
  status: "available" | "suppressed" | "unavailable";
  value: number | null;
  numerator?: number;
  denominator?: number;
  sample_size?: number;
}

export interface UsageReport {
  report: Report;
  from: string;
  to: string;
  filters: Filters;
  timezone: string;
  data_through: string | null;
  schema_version: number;
  min_installs: number;
  rows: UsageRow[];
}

/** null = the API has no analytics yet (endpoint not deployed). */
export async function getUsageStatus(): Promise<UsageStatus | null> {
  try {
    return (await mssApi<UsageStatus>("/admin/analytics/status")).data;
  } catch (e) {
    if (e instanceof MssApiError && e.status === 404) return null;
    throw e;
  }
}

export async function getUsageReport(report: Report, from: string, to: string, filters: Filters): Promise<UsageReport> {
  const q = new URLSearchParams({ from, to });
  for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
  return (await mssApi<UsageReport>(`/admin/analytics/reports/${report}?${q}`)).data;
}
