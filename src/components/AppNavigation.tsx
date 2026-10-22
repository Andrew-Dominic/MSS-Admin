"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FileText, LayoutDashboard, LogOut, PlusCircle, Rocket, Upload, type LucideIcon } from "lucide-react";
import { logout } from "@/app/login/actions";

export interface AdminUser {
  name: string | null;
  email: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active: (path: string) => boolean;
}

const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, active: (p) => p === "/" },
  {
    href: "/schemes",
    label: "Schemes",
    icon: FileText,
    active: (p) => p.startsWith("/schemes") && p !== "/schemes/new" && p !== "/schemes/upload",
  },
  { href: "/schemes/new", label: "New scheme", icon: PlusCircle, active: (p) => p === "/schemes/new" },
  { href: "/schemes/upload", label: "Upload", icon: Upload, active: (p) => p === "/schemes/upload" },
  { href: "/releases", label: "Releases", icon: Rocket, active: (p) => p.startsWith("/releases") },
  { href: "/notifications", label: "Notifications", icon: Bell, active: (p) => p.startsWith("/notifications") },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <aside className="z-20 hidden w-20 shrink-0 flex-col items-center gap-8 border-r border-gray-200 bg-white py-6 md:flex">
      <Link href="/" aria-label="MSS Admin home" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-xl font-extrabold text-white shadow-lg shadow-orange-500/25 transition-transform hover:scale-105">
        M
      </Link>
      <nav className="flex flex-col gap-3" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon, active }) => {
          const on = active(pathname);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              aria-current={on ? "page" : undefined}
              className={`rounded-2xl p-3 transition-all duration-200 ${on ? "scale-105 bg-orange-500 text-white shadow-md shadow-orange-500/30" : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"}`}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function TopHeaderNav({ user }: { user: AdminUser | null }) {
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);
  const name = user?.name?.trim() || user?.email?.split("@")[0] || "Admin";
  const initials = name.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "A";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-3 sm:h-20 sm:px-8 md:border-none md:bg-transparent">
      <Link href="/" aria-label="MSS Admin home" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-base font-extrabold text-white shadow-sm md:hidden">
        M
      </Link>

      <nav aria-label="Sections" className="no-scrollbar max-w-full overflow-x-auto py-1">
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-gray-100 bg-white p-1 shadow-sm sm:p-1.5">
          {NAV.filter((n) => n.href !== "/schemes/new" && n.href !== "/schemes/upload").map(({ href, label, active }) => {
            const on = active(pathname) || (href === "/schemes" && pathname.startsWith("/schemes"));
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm ${on ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex shrink-0 items-center gap-2 rounded-full border border-gray-100 bg-white py-1 pl-1.5 pr-2.5 shadow-sm sm:gap-3 sm:py-1.5 sm:pl-2 sm:pr-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-100 text-xs font-bold text-orange-600 sm:h-8 sm:w-8" aria-hidden>
          {initials}
        </div>
        <div className="hidden flex-col sm:flex">
          <span className="text-sm font-semibold leading-tight text-gray-900">{name}</span>
          {user?.email && <span className="font-mono text-xs leading-tight text-gray-500">{user.email}</span>}
        </div>
        <button
          type="button"
          onClick={async () => { setLeaving(true); await logout(); }}
          disabled={leaving}
          title="Sign out"
          aria-label="Sign out"
          className="cursor-pointer rounded-full p-1 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 sm:p-1.5"
        >
          <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>
    </header>
  );
}
