"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, FileText, LayoutDashboard, LogOut, Menu, PlusCircle, Rocket, Upload, Users, X, type LucideIcon } from "lucide-react";
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

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, active: (p) => p === "/" },
      { href: "/status", label: "System", icon: Activity, active: (p) => p.startsWith("/status") },
    ],
  },
  {
    title: "Catalogue",
    items: [
      {
        href: "/schemes",
        label: "Schemes",
        icon: FileText,
        active: (p) => p.startsWith("/schemes") && p !== "/schemes/new" && p !== "/schemes/upload",
      },
      { href: "/schemes/new", label: "New scheme", icon: PlusCircle, active: (p) => p === "/schemes/new" },
      { href: "/schemes/upload", label: "Upload dataset", icon: Upload, active: (p) => p === "/schemes/upload" },
      { href: "/releases", label: "Releases", icon: Rocket, active: (p) => p.startsWith("/releases") },
    ],
  },
  {
    title: "Engage",
    items: [
      { href: "/users", label: "Users", icon: Users, active: (p) => p.startsWith("/users") },
      { href: "/notifications", label: "Notifications", icon: Bell, active: (p) => p.startsWith("/notifications") },
    ],
  },
];

function initialsOf(user: AdminUser | null): { name: string; initials: string } {
  const name = user?.name?.trim() || user?.email?.split("@")[0] || "Admin";
  const initials = name.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "A";
  return { name, initials };
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" onClick={onNavigate} aria-label="MSS Admin home" className="group flex items-center gap-3 px-2">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/20 transition-transform duration-300 group-hover:scale-105">
        <Image src="/brand/mss-icon.webp" alt="" width={36} height={36} priority unoptimized />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight text-white">MSS Admin</span>
        <span className="block text-xs text-blue-200/70">MSME Schemes console</span>
      </span>
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="space-y-6">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-200/50">{section.title}</p>
          <ul className="space-y-1">
            {section.items.map(({ href, label, icon: Icon, active }) => {
              const on = active(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      on
                        ? "bg-white/[0.12] text-white shadow-inner shadow-white/5"
                        : "text-blue-100/70 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[var(--mss-saffron)] transition-opacity ${on ? "opacity-100" : "opacity-0"}`}
                    />
                    <Icon className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${on ? "text-blue-300" : ""}`} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard({ user }: { user: AdminUser | null }) {
  const [leaving, setLeaving] = useState(false);
  const { name, initials } = initialsOf(user);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white ring-2 ring-white/20" aria-hidden>
        {initials}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold text-white">{name}</span>
        {user?.email && <span className="block truncate text-xs text-blue-200/60">{user.email}</span>}
      </span>
      <button
        type="button"
        onClick={async () => {
          setLeaving(true);
          await logout();
        }}
        disabled={leaving}
        title="Sign out"
        aria-label="Sign out"
        className="cursor-pointer rounded-lg p-2 text-blue-200/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

const SIDEBAR_BG = "bg-[radial-gradient(120%_80%_at_0%_0%,#0b3a75_0%,var(--mss-navy)_45%,var(--mss-navy-deep)_100%)]";

/** Desktop sidebar (lg and up). */
export function SidebarNav({ user }: { user: AdminUser | null }) {
  const pathname = usePathname();
  return (
    <aside className={`z-20 hidden w-64 shrink-0 flex-col gap-8 px-4 py-6 lg:flex ${SIDEBAR_BG}`}>
      <Brand />
      <div className="flex-1 overflow-y-auto">
        <NavLinks pathname={pathname} />
      </div>
      <UserCard user={user} />
    </aside>
  );
}

/** Top bar with a slide-out menu, below the lg breakpoint. */
export function MobileNav({ user }: { user: AdminUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className={`flex h-16 shrink-0 items-center justify-between px-4 lg:hidden ${SIDEBAR_BG}`}>
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-xl p-2 text-white transition-colors hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className={`mss-fade-up absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-8 px-4 py-6 shadow-2xl ${SIDEBAR_BG}`}>
            <div className="flex items-center justify-between">
              <Brand onNavigate={() => setOpen(false)} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-xl p-2 text-blue-100 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <UserCard user={user} />
          </div>
        </div>
      )}
    </>
  );
}
