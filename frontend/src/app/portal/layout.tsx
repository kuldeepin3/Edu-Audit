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
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans print:bg-white print:text-black">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between p-5 shrink-0 print:hidden">
        <div className="space-y-6">
          {/* Logo & Agency Header */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 tracking-tight">
                EduAudit<span className="text-slate-600 font-normal"> Portal</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">District Infrastructure Cell</div>
            </div>
          </div>

          {/* Profile Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Assigned Auditor</div>
            <div className="font-bold text-sm text-slate-900 truncate">{user?.name || "DEO Officer"}</div>
            <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 pt-0.5">
              <MapPin size={13} className="text-slate-400 shrink-0" />
              <span>{auditor?.district || "Vadodara"} District</span>
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
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive 
                      ? "bg-slate-900 text-white shadow-sm" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-slate-200 bg-white transition-colors w-full cursor-pointer"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 print:p-0 print:m-0 print:overflow-visible print:bg-white print:w-full">
        {children}
      </main>
    </div>
  );
}
