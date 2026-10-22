"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { MobileNav, SidebarNav, type AdminUser } from "@/components/AppNavigation";

export function AdminLayoutShell({ children, user }: { children: React.ReactNode; user: AdminUser | null }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <main className="h-full min-h-screen w-full overflow-auto">{children}</main>;
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--mss-navy-deep)]">
      <SidebarNav user={user} />
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <MobileNav user={user} />
        {/* Content sits on a light, rounded canvas beside the dark sidebar. */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:my-3 lg:mr-3 lg:rounded-[28px] lg:p-8 lg:shadow-2xl lg:shadow-black/30">
          {children}
        </main>
      </div>
    </div>
  );
}
