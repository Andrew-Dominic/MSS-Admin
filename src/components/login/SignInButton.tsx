"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

/** Submit button that shows progress while the sign-in Server Action runs. */
export function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--mss-navy)] text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 disabled:cursor-wait disabled:opacity-80"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? "Signing in…" : "Sign In"}
    </button>
  );
}
