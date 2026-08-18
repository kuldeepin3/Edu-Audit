"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ShieldAlert, Mail, Lock, ArrowRight, AlertTriangle } from "lucide-react";

export default function AuditorLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, role, error, clearError, isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (isAuthenticated && role === "auditor") {
      router.push("/portal/dashboard");
    }
  }, [isAuthenticated, role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError("Please fill in all fields.");
      return;
    }

    try {
      const data = await login(email, password);
      if (data.user.role !== "auditor") {
        setLocalError("Access denied. This portal is for auditor accounts only.");
        useAuthStore.getState().logout();
      } else {
        router.push("/portal/dashboard");
      }
    } catch (err: any) {
      // Handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-2xl hover:border-slate-700 transition-all duration-300">
        <div className="text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white mx-auto shadow-lg shadow-indigo-500/20">
            <ShieldAlert size={24} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold font-display text-white">
            Auditor Officer Portal
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Internal auditing and monitoring control console
          </p>
        </div>

        {(localError || error) && (
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-900/30 flex items-start gap-3">
            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-400 font-medium">
              {localError || error}
            </p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-1">
                Auditor Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                  placeholder="deo@gov.in"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              {isLoading ? "Signing in..." : "Auditor Access Sign In"}
              {!isLoading && (
                <span className="absolute right-3 inset-y-0 flex items-center pl-3">
                  <ArrowRight className="h-5 w-5 text-indigo-300 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
