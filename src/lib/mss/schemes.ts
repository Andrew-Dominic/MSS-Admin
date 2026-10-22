import "server-only";
import { randomUUID } from "node:crypto";
import { mssApi } from "./api";
import type { Collection, Draft, PublishResult, ReleaseInfo, SchemeRecord, UploadPreview } from "./types";

/** `If-Match` value for a draft revision. */
export const draftEtag = (version: number) => `"draft-${version}"`;

/** All drafts (including published ones), following the UUID keyset pages. */
export async function listAllDrafts(maxPages = 50): Promise<Draft[]> {
  const all: Draft[] = [];
  let after: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const q = after ? `?after=${encodeURIComponent(after)}` : "";
    const { data } = await mssApi<{ items: Draft[] }>(`/admin/schemes/drafts${q}`);
    const items = data?.items ?? [];
    if (!items.length) break;
    all.push(...items);
    after = items[items.length - 1].id;
    if (items.length < 100) break;
  }
  return all;
}

export async function getDraft(id: string): Promise<Draft> {
  const { data } = await mssApi<Draft>(`/admin/schemes/drafts/${encodeURIComponent(id)}`);
  return data;
}

/** Create a draft for a new or existing scheme. `unchanged` when identical to the published copy. */
export async function createDraft(collection: Collection, scheme: SchemeRecord): Promise<Draft | { unchanged: true }> {
  const { data } = await mssApi<Draft | { unchanged: true }>(`/admin/schemes/drafts`, {
    method: "POST",
    body: { collection, scheme },
  });
  return data;
}

export async function createWithdrawal(schemeId: string): Promise<Draft> {
  const { data } = await mssApi<Draft>(`/admin/schemes/drafts`, {
    method: "POST",
    body: { action: "withdraw", scheme_id: schemeId },
  });
  return data;
}

export async function updateDraft(id: string, version: number, collection: Collection, scheme: SchemeRecord): Promise<Draft> {
  const { data } = await mssApi<Draft>(`/admin/schemes/drafts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { collection, scheme },
    headers: { "If-Match": draftEtag(version) },
  });
  return data;
}

export async function approveDraft(id: string, version: number, note: string): Promise<Draft> {
  const { data } = await mssApi<Draft>(`/admin/schemes/drafts/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: { note, allow_unreviewed_translation: true },
    headers: { "If-Match": draftEtag(version) },
  });
  return data;
}

export async function discardDraft(id: string, version: number, note: string): Promise<Draft> {
  const { data } = await mssApi<Draft>(`/admin/schemes/drafts/${encodeURIComponent(id)}/discard`, {
    method: "POST",
    body: { note },
    headers: { "If-Match": draftEtag(version) },
  });
  return data;
}

export async function previewUpload(dataset: unknown, idempotencyKey: string): Promise<UploadPreview> {
  const { data } = await mssApi<UploadPreview>(`/admin/schemes/uploads`, {
    method: "POST",
    body: dataset,
    headers: { "Idempotency-Key": idempotencyKey },
    timeoutMs: 120_000,
  });
  return data;
}

export async function stageUpload(uploadId: string): Promise<Draft[]> {
  const { data } = await mssApi<{ drafts: Draft[] }>(`/admin/schemes/uploads/${encodeURIComponent(uploadId)}/stage`, {
    method: "POST",
    body: {},
    timeoutMs: 120_000,
  });
  return data?.drafts ?? [];
}

export async function publishDrafts(drafts: { id: string; version: number }[], idempotencyKey: string): Promise<PublishResult> {
  const { data } = await mssApi<PublishResult>(`/admin/schemes/releases`, {
    method: "POST",
    body: { drafts },
    headers: { "Idempotency-Key": idempotencyKey },
    timeoutMs: 120_000,
  });
  return data;
}

export async function latestRelease(): Promise<ReleaseInfo | null> {
  const { data } = await mssApi<ReleaseInfo | null>(`/catalog/schemes/latest`, { anonymous: true });
  return data;
}

export async function apiHealth(): Promise<{ status: string; db: string; version?: string } | null> {
  try {
    const { data } = await mssApi<{ status: string; db: string; version?: string }>(`/health`, { anonymous: true });
    return data;
  } catch {
    return null;
  }
}

export async function sendNotification(input: {
  user_id: string;
  title: string;
  message: string;
  notification_type: "new_schemes" | "reminders" | "updates" | "profile";
}): Promise<{ id: string; created_at: string }> {
  const { data } = await mssApi<{ id: string; created_at: string }>(`/admin/notifications`, {
    method: "POST",
    body: input,
    headers: { "Idempotency-Key": randomUUID() },
  });
  return data;
}

/** A 16..100 character key for the upload/publish idempotency headers. */
export const newIdempotencyKey = (prefix: string) => `${prefix}-${randomUUID()}`.slice(0, 100);
