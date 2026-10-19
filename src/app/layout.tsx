import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin Portal",
  description: "IN Schemes Admin Portal",
};

import { Suspense } from "react";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { AdminLayoutShell } from "@/components/AdminLayoutShell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className={`${inter.className} h-full bg-[#F4F7F9] text-zinc-900 overflow-hidden`}>
        
        {/* Dynamic Admin Shell (Isolates /login from admin sidebar & header) */}
        <AdminLayoutShell>
          {children}
        </AdminLayoutShell>
        
        {/* Supabase Realtime Listener */}
        <RealtimeNotifications />
        
        {/* Instant Navigation Loading Indicator */}
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
      </body>
    </html>
  );
}
