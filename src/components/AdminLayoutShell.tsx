"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidebarNav, TopHeaderNav } from "@/components/AppNavigation";

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <main className="w-full h-full min-h-screen bg-[#F4F7F9] flex items-center justify-center overflow-auto">
        {children}
      </main>
    );
  }

  return (
    <div className="h-full flex w-full overflow-hidden bg-[#F4F7F9]">
      {/* Dynamic Highlighted Sidebar (Hidden on small mobile screens, replaced by responsive top bar) */}
      <SidebarNav />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Dynamic Highlighted Top Header Navigation */}
        <TopHeaderNav />

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
