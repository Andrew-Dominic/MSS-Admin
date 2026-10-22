import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { AdminLayoutShell } from "@/components/AdminLayoutShell";
import type { AdminUser } from "@/components/AppNavigation";
import { mssApi } from "@/lib/mss/api";
import { ACCESS_COOKIE } from "@/lib/mss/session";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MSS Admin",
  description: "Manage MSME schemes for the MSS app",
  robots: { index: false, follow: false },
};

async function currentUser(): Promise<AdminUser | null> {
  if (!(await cookies()).get(ACCESS_COOKIE)) return null;
  try {
    const { data } = await mssApi<{ user?: { name?: string | null; email?: string | null } }>("/me");
    return { name: data?.user?.name ?? null, email: data?.user?.email ?? null };
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className={`${inter.className} h-full overflow-hidden bg-[#F4F7F9] text-zinc-900`}>
        <AdminLayoutShell user={user}>{children}</AdminLayoutShell>
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
      </body>
    </html>
  );
}
