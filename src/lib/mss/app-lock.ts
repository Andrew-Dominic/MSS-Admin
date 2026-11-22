import "server-only";
import { mssApi } from "./api";

export interface AppLockState {
  locked: boolean;
  message: string | null;
  updated_at: string | null;
}

/** Current administrator app lock (admins and viewers). */
export async function getAppLock(): Promise<AppLockState> {
  return (await mssApi<AppLockState>("/admin/app-lock")).data;
}

/** Lock or unlock the whole app (admins only; the API refuses viewers). */
export async function setAppLock(locked: boolean, message: string | null): Promise<AppLockState> {
  return (
    await mssApi<AppLockState>("/admin/app-lock", {
      method: "PUT",
      body: locked && message ? { locked, message } : { locked },
    })
  ).data;
}
