"use server";

import { describeError } from "@/lib/mss/api";
import { sendNotification } from "@/lib/mss/schemes";

const TYPES = ["new_schemes", "reminders", "updates", "profile"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (title.length < 1 || title.length > 200) return { ok: false, error: "The title must be 1 to 200 characters." };
  if (message.length < 1 || message.length > 5000) return { ok: false, error: "The message must be 1 to 5000 characters." };
  const type = (TYPES as readonly string[]).includes(input.type) ? (input.type as (typeof TYPES)[number]) : "updates";
  try {
    const res = await sendNotification({ user_id: userId, title, message, notification_type: type });
    return { ok: true, id: res.id };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}
