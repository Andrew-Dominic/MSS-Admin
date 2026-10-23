import "server-only";
import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/lib/mss/session";

export const VIEW_ONLY_ERROR = "This is a view-only admin account. It can look at everything but cannot make changes.";

/** True for a view-only admin. Display and early refusal only: the API enforces it. */
export async function isViewOnly(): Promise<boolean> {
  return (await cookies()).get(ROLE_COOKIE)?.value === "viewer";
}
