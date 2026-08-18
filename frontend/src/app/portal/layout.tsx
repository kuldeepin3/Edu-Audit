"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { 
  LayoutDashboard, 
  FileText, 
  MapPin, 
  LogOut, 
  ShieldAlert,
  ClipboardList
} from "lucide-react";

export default function AuditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, auditor, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push("/portal/login");
  };

  // Do not show layout on the login page
  if (pathname === "/portal/login") {
    return <>{children}</>;
  }

  const links = [
    { href: "/portal/dashboard", label: "Overview Dashboard", icon: LayoutDashboard },
    { href: "/portal/complaints", label: "District Complaints", icon: ClipboardList },
    { href: "/portal/reports", label: "Inspection Reports", icon: FileText },
  ];

  return (
    <div className="min-h-screen flex bg-slate-900 text-white transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between p-6 shrink-0">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
              <ShieldAlert size={20} />
            </div>
            <span className="font-display text-lg font-bold">
              Auditor<span className="text-indigo-400">Portal</span>
            </span>
          </div>

          {/* Profile Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Assigned Auditor</div>
            <div className="font-bold truncate">{user?.name || "Officer"}</div>
            <div className="text-xs text-indigo-400 font-medium flex items-center gap-1">
              <MapPin size={12} /> {auditor?.district || "Unknown District"} District
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors w-full"
        >
          <LogOut size={18} />
          Sign Out Portal
        </button>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto p-8 bg-slate-900">
        {children}
      </main>
    </div>
  );
}
