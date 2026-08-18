"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Shield, Menu, X, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/report", label: "Report" },
  { href: "/track", label: "Track" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chatbot", label: "AI Chatbot" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated, fetchCurrentUser, logout } = useAuthStore();

  // Hydration safety and session restoration
  useEffect(() => {
    setMounted(true);
    if (!user) {
      fetchCurrentUser().catch(() => {});
    }
  }, [user, fetchCurrentUser]);

  if (pathname?.startsWith("/portal") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <Shield size={20} />
          </div>
          <span className="font-display text-lg font-bold text-slate-900 dark:text-white">
            EduAudit<span className="text-brand-600"> AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA & Auth Action */}
        <div className="hidden md:flex items-center gap-4">
          {mounted && isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link 
                href="/profile" 
                className="flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors"
                title="View Profile"
              >
                <User size={16} />
                <span className="max-w-[100px] truncate">{user?.name}</span>
              </Link>
              <button 
                onClick={() => logout()}
                className="flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-600 hover:underline"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="relative">
              <button 
                onClick={() => setAuthDropdownOpen(!authDropdownOpen)}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors flex items-center gap-1 focus:outline-none"
              >
                Sign In
                <span className="text-[9px] opacity-75">▼</span>
              </button>
              
              {authDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown on click outside */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setAuthDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1.5 shadow-xl z-50 animate-fadeIn space-y-0.5">
                    <Link 
                      href="/login" 
                      onClick={() => setAuthDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      👤 Citizen Login
                    </Link>
                    <Link 
                      href="/portal/login" 
                      onClick={() => setAuthDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      🛡️ Auditor Portal
                    </Link>
                    <Link 
                      href="/admin/login" 
                      onClick={() => setAuthDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      ⚙️ Admin Console
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
          <Link href="/report" className="btn-primary">
            Report Issue
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-slate-600 dark:text-slate-300"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 md:hidden space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium",
                pathname === link.href
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              {link.label}
            </Link>
          ))}
          
          <hr className="border-slate-200 dark:border-slate-800" />
          
          {mounted && isAuthenticated ? (
            <div className="space-y-2 px-3">
              <div className="text-xs text-slate-400">Signed in as <span className="font-semibold">{user?.name}</span></div>
              <Link 
                href="/profile" 
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600"
              >
                My Profile
              </Link>
              <button 
                onClick={() => { logout(); setMobileOpen(false); }}
                className="block text-sm font-medium text-red-500 hover:underline text-left w-full"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 px-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sign In Portals</div>
              <Link 
                href="/login" 
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600"
              >
                👤 Citizen Login
              </Link>
              <Link 
                href="/portal/login" 
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600"
              >
                🛡️ Auditor Portal
              </Link>
              <Link 
                href="/admin/login" 
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600"
              >
                ⚙️ Admin Console
              </Link>
            </div>
          )}
          
          <div className="pt-2">
            <Link 
              href="/report" 
              onClick={() => setMobileOpen(false)}
              className="block btn-primary text-center py-2"
            >
              Report Issue
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
