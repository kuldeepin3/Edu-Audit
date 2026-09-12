"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Shield, Mail, Lock, ArrowRight, AlertTriangle } from "lucide-react";

function CitizenLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const { login, isAuthenticated, role, error, clearError, isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === "citizen") {
        router.push(redirect || "/dashboard");
      } else if (role === "auditor") {
        router.push("/portal/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      }
    }
  }, [isAuthenticated, role, router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError("Please fill in all fields.");
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      // Handled by store, will update error state
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl hover:border-brand-500/30 transition-all duration-300">
      <div className="text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white mx-auto shadow-lg shadow-brand-500/20">
          <Shield size={24} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold font-display text-slate-900 dark:text-white">
          Sign in to EduAudit
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Citizen Infrastructure Monitoring Portal
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {localError && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/30 rounded-xl text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="shrink-0 text-amber-500" />
          <span>{localError}</span>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-colors"
                placeholder="citizen@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
          >
            {isLoading ? "Signing in..." : "Sign In"}
            {!isLoading && (
              <span className="absolute right-3 inset-y-0 flex items-center pl-3">
                <ArrowRight className="h-5 w-5 text-brand-300 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </button>
        </div>
      </form>

      <div className="text-center mt-6 text-sm">
        <span className="text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{" "}
        </span>
        <Link
          href="/register"
          className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
        >
          Register here
        </Link>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800/80 pt-6 mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <span className="block mb-2 font-semibold tracking-wide uppercase text-[10px] text-slate-400">Official Access Portals</span>
        <div className="flex justify-center gap-4">
          <Link href="/portal/login" className="font-medium hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            Auditor Portal
          </Link>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <Link href="/admin/login" className="font-medium hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            System Admin Console
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CitizenLoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
        <CitizenLoginForm />
      </Suspense>
    </div>
  );
}
