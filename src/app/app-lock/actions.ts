"use server";

import { revalidatePath } from "next/cache";
import { describeError } from "@/lib/mss/api";
import { isViewOnly, VIEW_ONLY_ERROR } from "@/lib/mss/role";
import { setAppLock, type AppLockState } from "@/lib/mss/app-lock";

export async function changeAppLock(input: {
  locked: boolean;
  message: string;
}): Promise<{ ok: true; data: AppLockState } | { ok: false; error: string }> {
  if (await isViewOnly()) return { ok: false, error: VIEW_ONLY_ERROR };
  const message = input.message.trim();
  if (message.length > 500) return { ok: false, error: "The message must be at most 500 characters." };
  try {
    const data = await setAppLock(input.locked === true, message || null);
    revalidatePath("/app-lock");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}
