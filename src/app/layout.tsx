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
import { SidebarNav, TopHeaderNav } from "@/components/AppNavigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className={`${inter.className} h-full flex bg-[#F4F7F9] text-zinc-900 overflow-hidden`}>
        
        {/* Dynamic Highlighted Sidebar */}
        <SidebarNav />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Dynamic Highlighted Top Header Navigation */}
          <TopHeaderNav />

          {/* Scrollable Page Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </div>
        </main>
        
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
