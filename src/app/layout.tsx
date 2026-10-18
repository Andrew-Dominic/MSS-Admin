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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className={`${inter.className} h-full flex bg-[#F4F7F9] text-zinc-900 overflow-hidden`}>
        
        {/* Minimal Sidebar */}
        <aside className="w-20 border-r border-gray-200 bg-white flex flex-col items-center py-6 gap-8 shrink-0 z-20">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            A
          </div>
          <nav className="flex flex-col gap-6 text-gray-400">
            <Link href="/" title="Dashboard Overview">
              <div className="p-3 rounded-xl hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              </div>
            </Link>
            <Link href="/schemes" title="Schemes Catalog">
              <div className="p-3 rounded-xl hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
            </Link>
            <Link href="/schemes/new" title="New Scheme Draft">
              <div className="p-3 rounded-xl hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </div>
            </Link>
            <Link href="/tickets" title="Bug Reports & Support Tickets">
              <div className="p-3 rounded-xl hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
            </Link>
            <Link href="/notifications" title="Announcements & Mobile Alerts">
              <div className="p-3 rounded-xl hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </div>
            </Link>
            <Link href="#" title="Settings">
              <div className="p-3 rounded-xl hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </div>
            </Link>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Top Header */}
          <header className="h-20 flex items-center justify-between px-8 shrink-0">
            <div className="bg-white rounded-full px-6 py-2 shadow-sm flex items-center gap-6">
              <Link href="/" className="text-gray-900 hover:text-orange-500 font-medium text-sm transition-colors">Overview</Link>
              <Link href="/schemes" className="text-gray-500 hover:text-orange-500 font-medium text-sm transition-colors">Schemes</Link>
              <Link href="/tickets" className="text-gray-500 hover:text-orange-500 font-medium text-sm transition-colors flex items-center gap-1.5">
                Bug Reports
              </Link>
              <Link href="/notifications" className="text-gray-500 hover:text-orange-500 font-medium text-sm transition-colors flex items-center gap-1.5">
                Announcements
              </Link>
              <span className="text-gray-400 font-medium text-sm cursor-default">Releases</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white rounded-full p-2.5 shadow-sm text-gray-500 cursor-pointer hover:text-gray-900">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </div>
              <div className="bg-white rounded-full pl-2 pr-4 py-1.5 shadow-sm flex items-center gap-3 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs border border-orange-200 shrink-0">
                  AU
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 leading-tight">Admin User</span>
                  <span className="text-xs text-gray-500 leading-tight">admin@prajaya.org</span>
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Page Content */}
          <div className="flex-1 overflow-y-auto p-8">
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
