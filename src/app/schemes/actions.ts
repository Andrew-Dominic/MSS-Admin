"use server";

import { revalidatePath } from "next/cache";
import { describeError } from "@/lib/mss/api";
import {
  approveDraft,
  createDraft,
  createWithdrawal,
  discardDraft,
  getDraft,
  newIdempotencyKey,
  previewUpload,
  publishDrafts,
  sendBroadcast,
  stageUpload,
  updateDraft,
} from "@/lib/mss/schemes";
import {
  COLLECTIONS,
  SCHEME_ID_PATTERN,
  collectionForId,
  type BroadcastReceipt,
  type Collection,
  type PublishResult,
  type SchemeRecord,
  type UploadPreview,
} from "@/lib/mss/types";
import { audienceStates } from "@/lib/mss/changes";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: unknown): { ok: false; error: string } => ({ ok: false, error: describeError(error) });

function refresh() {
  revalidatePath("/", "layout");
}

function validateRecord(collection: Collection, scheme: SchemeRecord): string | null {
  if (!COLLECTIONS.some((c) => c.value === collection)) return "Choose a collection.";
  if (!scheme || typeof scheme !== "object") return "The scheme record is empty.";
  if (!SCHEME_ID_PATTERN.test(scheme.id ?? "")) return "Scheme ID must look like CEN2026-001, TN2026-001 or MAH2026-001.";
  if (collectionForId(scheme.id) !== collection) return "The scheme ID prefix does not match the chosen collection.";
  if (!scheme.name?.en?.trim()) return "An English name is required.";
  if (!scheme.level) return "Choose a level (central, state or central_state).";
  if (!scheme.state?.trim()) return "A state is required (use \"All India\" for nationwide schemes).";
  return null;
}

/** Create a new draft, or save changes to an open draft (optimistic locking by version). */
export async function saveScheme(input: {
  draftId?: string;
  version?: number;
  collection: Collection;
  scheme: SchemeRecord;
}): Promise<ActionResult<{ draftId: string | null; version: number | null; unchanged: boolean }>> {
  const invalid = validateRecord(input.collection, input.scheme);
  if (invalid) return { ok: false, error: invalid };
  try {
    if (input.draftId && input.version) {
      const d = await updateDraft(input.draftId, input.version, input.collection, input.scheme);
      refresh();
      return { ok: true, data: { draftId: d.id, version: d.version, unchanged: false } };
    }
    const d = await createDraft(input.collection, input.scheme);
    refresh();
    if ("unchanged" in d) return { ok: true, data: { draftId: null, version: null, unchanged: true } };
    return { ok: true, data: { draftId: d.id, version: d.version, unchanged: false } };
  } catch (e) {
    return fail(e);
  }
}

function checkNote(note: string): string | null {
  const n = note.trim();
  return n.length < 10 || n.length > 2000 ? "Write a note of 10 to 2000 characters." : null;
}

export async function approveScheme(draftId: string, version: number, note: string): Promise<ActionResult<{ version: number }>> {
  const bad = checkNote(note);
  if (bad) return { ok: false, error: bad };
  try {
    const d = await approveDraft(draftId, version, note.trim());
    refresh();
    return { ok: true, data: { version: d.version } };
  } catch (e) {
    return fail(e);
  }
}

export async function discardScheme(draftId: string, version: number, note: string): Promise<ActionResult> {
  const bad = checkNote(note);
  if (bad) return { ok: false, error: bad };
  try {
    await discardDraft(draftId, version, note.trim());
    refresh();
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function withdrawScheme(schemeId: string): Promise<ActionResult<{ draftId: string }>> {
  if (!SCHEME_ID_PATTERN.test(schemeId)) return { ok: false, error: "Invalid scheme ID." };
  try {
    const d = await createWithdrawal(schemeId);
    refresh();
    return { ok: true, data: { draftId: d.id } };
  } catch (e) {
    return fail(e);
  }
}

/** Preview a dataset envelope (writes nothing on the server). */
export async function previewDataset(dataset: unknown): Promise<ActionResult<UploadPreview>> {
  try {
    return { ok: true, data: await previewUpload(dataset, newIdempotencyKey("upload")) };
  } catch (e) {
    return fail(e);
  }
}

export async function stageDataset(uploadId: string): Promise<ActionResult<{ drafts: number }>> {
  try {
    const drafts = await stageUpload(uploadId);
    refresh();
    return { ok: true, data: { drafts: drafts.length } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * [publishKey] is created by the page for this exact selection and reused if
 * the admin retries after an uncertain failure, so the API replays the
 * original release instead of publishing twice.
 */
export async function publishApproved(
  drafts: { id: string; version: number }[],
  publishKey: string,
  notify: boolean,
): Promise<ActionResult<PublishResult>> {
  if (!drafts.length) return { ok: false, error: "Select at least one approved draft." };
  if (drafts.length > 2000) return { ok: false, error: "Publish at most 2000 drafts at a time." };
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(publishKey)) return { ok: false, error: "Reload the page and try again." };
  try {
    const result = await publishDrafts(drafts, publishKey, notify);
    refresh();
    return { ok: true, data: result };
  } catch (e) {
    return fail(e);
  }
}

const NOTIFY_TYPES = ["new_schemes", "reminders", "updates", "profile"] as const;
const UUID_V = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PublishAndNotifyResult {
  /** Null when the draft had already been published by an earlier attempt. */
  releaseVersion: string | null;
  replayed: boolean;
  broadcast: BroadcastReceipt | null;
  /** Set when publishing worked but the notification could not be queued. */
  broadcastError?: string;
}

/**
 * Approve (if needed) and publish one draft as its own release, then
 * optionally notify the users it concerns. Each step is safe to retry: the
 * draft's status says which steps already happened, [publishKey] replays an
 * uncertain publish and [notify.campaignKey] an uncertain broadcast.
 */
export async function publishAndNotify(input: {
  draftId: string;
  version: number;
  note: string;
  publishKey: string;
  notify: { title: string; message: string; type: string; campaignKey: string } | null;
}): Promise<ActionResult<PublishAndNotifyResult>> {
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(input.publishKey)) return { ok: false, error: "Reload the page and try again." };
  const n = input.notify;
  let notification: { title: string; message: string; type: (typeof NOTIFY_TYPES)[number] } | null = null;
  if (n) {
    const title = n.title.trim();
    const message = n.message.trim();
    if (title.length < 1 || title.length > 200) return { ok: false, error: "The notification title must be 1 to 200 characters." };
    if (message.length < 1 || message.length > 5000) return { ok: false, error: "The notification message must be 1 to 5000 characters." };
    if (!UUID_V.test(n.campaignKey)) return { ok: false, error: "Reload the page and try again." };
    const type = (NOTIFY_TYPES as readonly string[]).includes(n.type) ? (n.type as (typeof NOTIFY_TYPES)[number]) : "updates";
    notification = { title, message, type };
  }
  try {
    let draft = await getDraft(input.draftId);
    if (draft.action !== "upsert") return { ok: false, error: "Only scheme changes can be published from here. Use Releases for withdrawals." };
    if (draft.status === "discarded") return { ok: false, error: "This draft was discarded." };
    let releaseVersion: string | null = null;
    let replayed = false;
    if (draft.status !== "published") {
      if (draft.version !== input.version && draft.status === "draft") {
        return { ok: false, error: "This draft changed since the page loaded. Reload it and try again." };
      }
      if (draft.status === "draft") {
        const bad = checkNote(input.note);
        if (bad) return { ok: false, error: bad };
        draft = await approveDraft(draft.id, draft.version, input.note.trim());
      }
      const result = await publishDrafts([{ id: draft.id, version: draft.version }], input.publishKey, false);
      releaseVersion = result.release_version;
      replayed = result.replayed;
    }
    refresh();
    let broadcast: BroadcastReceipt | null = null;
    if (notification && n) {
      const collection = draft.payload?.collection ?? collectionForId(draft.scheme_id);
      const states = audienceStates(collection);
      try {
        broadcast = await sendBroadcast(
          { title: notification.title, message: notification.message, notification_type: notification.type, audience: states.length ? { states } : {} },
          n.campaignKey,
        );
      } catch (e) {
        return { ok: true, data: { releaseVersion, replayed, broadcast: null, broadcastError: describeError(e) } };
      }
    }
    return { ok: true, data: { releaseVersion, replayed, broadcast } };
  } catch (e) {
    return fail(e);
  }
}
