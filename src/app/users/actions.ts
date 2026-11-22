"use server";

import { revalidatePath } from "next/cache";
import { describeError, mssApi } from "@/lib/mss/api";
import { isViewOnly, VIEW_ONLY_ERROR } from "@/lib/mss/role";

export type ModerationAction = "remove" | "restore" | "ban" | "unban" | "purge";
const ACTIONS: ModerationAction[] = ["remove", "restore", "ban", "unban", "purge"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Remove (30-day grace, admin can restore), restore, ban, unban or permanently
 * delete one app user. The API re-checks the admin role, protects admin and
 * view-only accounts and audits every action.
 */
export async function moderateUser(input: {
  userId: string;
  action: ModerationAction;
  note?: string;
  confirmEmail?: string;
  block?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await isViewOnly()) return { ok: false, error: VIEW_ONLY_ERROR };
  if (!UUID.test(input.userId) || !ACTIONS.includes(input.action)) return { ok: false, error: "Unknown user or action." };
  const note = (input.note ?? "").trim();
  if (note.length > 500) return { ok: false, error: "The note must be at most 500 characters." };
  const body: Record<string, unknown> = note ? { note } : {};
  if (input.action === "purge") {
    const email = (input.confirmEmail ?? "").trim();
    if (!email) return { ok: false, error: "Type the account's email to confirm the permanent delete." };
    body.confirm_email = email;
    body.block = input.block === true;
  }
  try {
    await mssApi(`/admin/users/${encodeURIComponent(input.userId)}/${input.action}`, { method: "POST", body });
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}
