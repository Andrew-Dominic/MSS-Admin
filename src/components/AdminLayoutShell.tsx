"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Eye } from "lucide-react";
import { MobileNav, SidebarNav, type AdminUser } from "@/components/AppNavigation";

/** Pages whose forms change data: locked for view-only admins. */
const WRITE_PAGES = [
  /^\/schemes\/(new|upload)$/,
  /^\/schemes\/catalog\/[^/]+$/,
  /^\/schemes\/[0-9a-f-]{36}$/,
  /^\/notifications$/,
];

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
          {user?.viewOnly && (
            <div role="status" className="mx-auto mb-4 flex max-w-7xl items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200">
              <Eye className="h-4 w-4 shrink-0" />
              View-only access: you can look at everything, but changes are turned off for this account.
            </div>
          )}
          {user?.viewOnly && WRITE_PAGES.some((re) => re.test(pathname)) ? (
            // Disables every button and field on the page; the API refuses changes anyway.
            <fieldset disabled aria-disabled="true" className="m-0 min-w-0 border-0 p-0 opacity-80">
              {children}
            </fieldset>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
