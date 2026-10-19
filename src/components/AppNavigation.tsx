"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Bug, 
  Bell, 
  Settings,
  ChevronRight,
  LogOut
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/login/actions";

export function SidebarNav() {
  const pathname = usePathname();

  const isOverview = pathname === "/";
  const isSchemes = pathname.startsWith("/schemes");
  const isNewScheme = pathname === "/schemes/new";
  const isTickets = pathname.startsWith("/tickets");
  const isNotifications = pathname.startsWith("/notifications");

  return (
    <aside className="w-20 border-r border-gray-200 bg-white flex flex-col items-center py-6 gap-8 shrink-0 z-20">
      <Link href="/" className="w-11 h-11 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-orange-500/25 hover:scale-105 transition-transform">
        A
      </Link>

      <nav className="flex flex-col gap-3">
        <Link 
          href="/" 
          title="Dashboard Overview"
          className={`p-3 rounded-2xl transition-all duration-200 ${
            isOverview 
              ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105" 
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
        </Link>

        <Link 
          href="/schemes" 
          title="Schemes Catalog & Editor"
          className={`p-3 rounded-2xl transition-all duration-200 ${
            isSchemes && !isNewScheme
              ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105" 
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <FileText className="w-5 h-5" />
        </Link>

        <Link 
          href="/schemes/new" 
          title="Draft New Scheme"
          className={`p-3 rounded-2xl transition-all duration-200 ${
            isNewScheme 
              ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105" 
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <PlusCircle className="w-5 h-5" />
        </Link>

        <Link 
          href="/tickets" 
          title="Bug Reports & Support Tickets"
          className={`p-3 rounded-2xl transition-all duration-200 ${
            isTickets 
              ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105" 
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Bug className="w-5 h-5" />
        </Link>

        <Link 
          href="/notifications" 
          title="Announcements & Mobile Alerts"
          className={`p-3 rounded-2xl transition-all duration-200 ${
            isNotifications 
              ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105" 
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Bell className="w-5 h-5" />
        </Link>
      </nav>
    </aside>
  );
}

export function TopHeaderNav() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>("admin@msme.gov.in");
  const [userName, setUserName] = useState<string>("Admin User");
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) {
          setUserEmail(user.email);
          const metaName = user.user_metadata?.full_name || user.email.split("@")[0];
          setUserName(metaName.charAt(0).toUpperCase() + metaName.slice(1));
        }
      }).catch(() => {
        // Fallback default
      });
    } catch {
      // Fallback default
    }
  }, []);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "AU";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const isOverview = pathname === "/";
  const isSchemes = pathname.startsWith("/schemes");
  const isTickets = pathname.startsWith("/tickets");
  const isNotifications = pathname.startsWith("/notifications");

  return (
    <header className="h-20 flex items-center justify-between px-8 shrink-0">
      {/* Pill Navigation Bar with Dynamic Active States */}
      <div className="bg-white rounded-full p-1.5 shadow-sm border border-gray-100 flex items-center gap-1">
        <Link 
          href="/" 
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
            isOverview 
              ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Overview
        </Link>

        <Link 
          href="/schemes" 
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
            isSchemes 
              ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Schemes
        </Link>

        <Link 
          href="/tickets" 
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
            isTickets 
              ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Bug Reports
        </Link>

        <Link 
          href="/notifications" 
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
            isNotifications 
              ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Announcements
        </Link>

        <span className="px-4 py-2 rounded-full text-sm font-medium text-gray-400 cursor-default">
          Releases
        </span>
      </div>

      {/* Right Controls / Admin Profile */}
      <div className="flex items-center gap-3">
        <Link href="/notifications" className="bg-white rounded-full p-2.5 shadow-sm border border-gray-100 text-gray-500 hover:text-orange-600 transition-colors" title="Announcements & Alerts">
          <Bell className="w-5 h-5" />
        </Link>
        <div className="bg-white rounded-full pl-2 pr-3 py-1.5 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs border border-orange-200 shrink-0">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 leading-tight">{userName}</span>
            <span className="text-xs text-gray-500 leading-tight font-mono">{userEmail}</span>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Sign out of Admin Portal"
            className="ml-1 p-1.5 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
