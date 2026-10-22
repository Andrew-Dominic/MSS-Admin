import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { DitherCanvas } from "@/components/login/DitherCanvas";
import { SignInButton } from "@/components/login/SignInButton";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const raw = params?.redirectTo || "/";
  const redirectTo = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const field =
    "h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15";

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[radial-gradient(120%_120%_at_20%_10%,#dbeafe_0%,#eff6ff_35%,#c7d7f5_100%)] p-4 sm:p-8">
      {/* Soft background glows */}
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-400/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-[var(--mss-navy)]/20 blur-3xl" />

      <div className="mss-fade-up relative w-full max-w-5xl rounded-[28px] bg-white/60 p-2 shadow-[0_30px_80px_-20px_rgba(1,40,79,0.35)] ring-1 ring-white/70 backdrop-blur-xl">
        <div className="grid overflow-hidden rounded-[22px] bg-white md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Form side */}
          <div className="flex flex-col justify-center px-7 py-10 sm:px-12 sm:py-14">
            <Image src="/brand/mss-logo.webp" alt="MSS" width={88} height={83} priority unoptimized className="mb-8 h-auto w-[88px]" />
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Sign In</h1>
            <p className="mt-2 font-mono text-[13px] text-slate-500">Continue to the MSS admin console</p>

            <form action={login} className="mt-8 space-y-5">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              {error && (
                <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}
              <label className="block space-y-2">
                <span className="font-mono text-xs font-semibold text-slate-700">Email</span>
                <input name="email" type="email" required autoComplete="username" placeholder="Enter your email" className={field} />
              </label>
              <label className="block space-y-2">
                <span className="font-mono text-xs font-semibold text-slate-700">Password</span>
                <input name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" className={field} />
              </label>
              <SignInButton />
            </form>

            <p className="mt-8 flex items-center justify-center gap-2 text-center font-mono text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Admins only · access is granted by the server administrator
            </p>
          </div>

          {/* Animated dither side */}
          <div className="relative hidden min-h-[540px] overflow-hidden bg-white md:block">
            <DitherCanvas className="absolute inset-0" />
            <div className="absolute bottom-6 right-6 rounded-2xl bg-white/80 px-4 py-3 text-right shadow-lg ring-1 ring-slate-100 backdrop-blur">
              <p className="text-sm font-semibold text-[var(--mss-navy)]">MSME Schemes Search</p>
              <p className="text-xs text-slate-500">Government schemes for every Indian business</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
