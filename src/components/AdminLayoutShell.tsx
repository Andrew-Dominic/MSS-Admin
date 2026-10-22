"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidebarNav, TopHeaderNav, type AdminUser } from "@/components/AppNavigation";

export function AdminLayoutShell({ children, user }: { children: React.ReactNode; user: AdminUser | null }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <main className="flex h-full min-h-screen w-full items-center justify-center overflow-auto bg-[#F4F7F9]">{children}</main>;
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#F4F7F9]">
      <SidebarNav />
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <TopHeaderNav user={user} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
