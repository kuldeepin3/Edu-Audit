"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { User, Mail, Phone, Shield, Award, Edit3, Save, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(true);
    setIsEditing(false);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  const reputationScore = user?.reputation_score ?? 0;
  const reputationLevel = user?.reputation_level || (reputationScore > 80 ? "Champion" : reputationScore > 50 ? "Contributor" : reputationScore > 20 ? "Trusted" : "New");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 transition-colors duration-200">
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header decoration */}
        <div className="h-32 bg-gradient-to-r from-brand-600 to-brand-800 flex items-end justify-between px-8 pb-4 text-white">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-white text-brand-700 flex items-center justify-center font-bold text-2xl shadow-lg translate-y-6 border border-slate-100 dark:border-slate-900">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="translate-y-2">
              <h2 className="text-xl font-bold font-display leading-tight">{user?.name || "Citizen"}</h2>
              <span className="text-sm text-brand-200 capitalize font-medium">{user?.role} Account</span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1">
            <Award size={14} className="text-amber-400" /> {reputationLevel}
          </div>
        </div>

        <div className="pt-12 p-8 space-y-8">
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
              <CheckCircle size={18} />
              Profile updated successfully! (Local changes only)
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 disabled:opacity-75 disabled:cursor-not-allowed text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 disabled:opacity-75 disabled:cursor-not-allowed text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Reputation Points
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Award size={18} />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={`${reputationScore} Points`}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setName(user?.name || "");
                      setPhone(user?.phone || "");
                      setIsEditing(false);
                    }}
                    className="px-5 py-2.5 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-500/10 transition-colors"
                  >
                    <Save size={16} /> Save Changes
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Edit3 size={16} /> Edit Profile
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
