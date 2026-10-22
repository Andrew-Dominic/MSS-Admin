"use server";

import { describeError } from "@/lib/mss/api";
import { getBroadcast, sendBroadcast, sendNotification } from "@/lib/mss/schemes";
import {
  BROADCAST_LANGUAGES,
  STATES,
  type BroadcastLanguage,
  type BroadcastProgress,
  type BroadcastReceipt,
} from "@/lib/mss/types";

const TYPES = ["new_schemes", "reminders", "updates", "profile"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATE_CODES = new Set(STATES.map((s) => s.code));
const LANGUAGES = new Set<string>(BROADCAST_LANGUAGES.map((l) => l.value));

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function checkText(title: string, message: string): string | null {
  if (title.length < 1 || title.length > 200) return "The title must be 1 to 200 characters.";
  if (message.length < 1 || message.length > 5000) return "The message must be 1 to 5000 characters.";
  return null;
}

export async function notifyUser(input: {
  userId: string;
  title: string;
  message: string;
  type: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = input.userId.trim();
  const title = input.title.trim();
  const message = input.message.trim();
  if (!UUID.test(userId)) return { ok: false, error: "Enter the user's ID (a UUID, from their account)." };
  const bad = checkText(title, message);
  if (bad) return { ok: false, error: bad };
  const type = (TYPES as readonly string[]).includes(input.type) ? (input.type as (typeof TYPES)[number]) : "updates";
  try {
    const res = await sendNotification({ user_id: userId, title, message, notification_type: type });
    return { ok: true, id: res.id };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

/**
 * Send to everyone, or to users in the chosen states and/or languages.
 * [campaignKey] is created once per campaign by the form and reused on retry.
 */
export async function broadcastNotification(input: {
  title: string;
  message: string;
  type: string;
  states: string[];
  languages: string[];
  campaignKey: string;
}): Promise<Result<BroadcastReceipt>> {
  const title = input.title.trim();
  const message = input.message.trim();
  const bad = checkText(title, message);
  if (bad) return { ok: false, error: bad };
  if (!UUID.test(input.campaignKey)) return { ok: false, error: "Reload the page and try again." };
  const states = [...new Set(input.states)];
  const languages = [...new Set(input.languages)];
  if (!states.every((s) => STATE_CODES.has(s))) return { ok: false, error: "Unknown state selected." };
  if (!languages.every((l) => LANGUAGES.has(l))) return { ok: false, error: "Unknown language selected." };
  const type = (TYPES as readonly string[]).includes(input.type) ? (input.type as (typeof TYPES)[number]) : "updates";
  const audience: { states?: string[]; languages?: BroadcastLanguage[] } = {};
  if (states.length) audience.states = states;
  if (languages.length) audience.languages = languages as BroadcastLanguage[];
  try {
    const data = await sendBroadcast({ title, message, notification_type: type, audience }, input.campaignKey);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function broadcastProgress(id: string): Promise<Result<BroadcastProgress>> {
  if (!UUID.test(id)) return { ok: false, error: "Not a broadcast ID." };
  try {
    return { ok: true, data: await getBroadcast(id) };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}
