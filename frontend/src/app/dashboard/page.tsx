"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { 
  Award, 
  PlusCircle, 
  MessageSquare, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MapPin,
  ArrowRight
} from "lucide-react";

export default function CitizenDashboardPage() {
  const { user, fetchCurrentUser } = useAuthStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      fetchCurrentUser().catch(() => {});
    }
  }, [user, fetchCurrentUser]);

  useEffect(() => {
    async function fetchComplaints() {
      if (!user) return;
      try {
        const data = await api.listComplaints({ page: 1, page_size: 10 });
        // Filter complaints reported by this citizen
        const userComplaints = (data.items || []).filter(
          (c: any) => c.reporter_id === user.id || c.reporter?.id === user.id
        );
        setComplaints(userComplaints);
      } catch (err) {
        console.error("Failed to load complaints:", err);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      fetchComplaints();
    }
  }, [user]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "resolved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle size={12} /> Resolved
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={12} /> Rejected
        </span>
      );
    }
    if (s === "in_progress" || s === "assigned" || s === "pending_completion") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
          <Clock size={12} /> In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <Clock size={12} /> Submitted
      </span>
    );
  };

  const reputationScore = user?.reputation_score ?? 0;
  const reputationLevel = user?.reputation_level || (reputationScore > 80 ? "Champion" : reputationScore > 50 ? "Contributor" : reputationScore > 20 ? "Trusted" : "New");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8 transition-colors duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-brand-500/10">
        <div className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold">
            Welcome, {user?.name || "Citizen Auditor"}!
          </h1>
          <p className="text-brand-100 text-sm md:text-base max-w-xl">
            You are part of a community ensuring quality education and clean infrastructure in government schools.
          </p>
        </div>

        {/* Reputation Level Widget */}
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/15">
          <div className="h-12 w-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg">
            <Award size={24} />
          </div>
          <div>
            <div className="text-xs text-brand-200 font-semibold uppercase tracking-wider">Reputation Status</div>
            <div className="text-lg font-bold flex items-center gap-1.5">
              {reputationLevel}
              <span className="text-sm font-medium text-brand-100">({reputationScore} pts)</span>
            </div>
            <div className="mt-1.5 w-32 bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-400 h-full rounded-full" 
                style={{ width: `${Math.min(reputationScore, 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          href="/report"
          className="group flex items-start gap-4 p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-500/40 transition-all duration-300"
        >
          <div className="h-12 w-12 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
            <PlusCircle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
              File a Complaint
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Submit photos and report new defects or infrastructure issues.
            </p>
          </div>
        </Link>

        <Link 
          href="/track"
          className="group flex items-start gap-4 p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-500/40 transition-all duration-300"
        >
          <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
            <Search size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
              Track Complaints
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Search by Report ID to check review progress and resolution details.
            </p>
          </div>
        </Link>

        <Link 
          href="/chatbot"
          className="group flex items-start gap-4 p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-500/40 transition-all duration-300"
        >
          <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
            <MessageSquare size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
              AI Chatbot
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ask questions about rules, resolutions, or data summaries.
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Complaints */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">
              My Recent Complaints
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Track status updates for reports you submitted
            </p>
          </div>
          
          <Link 
            href="/my-complaints"
            className="flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
            <span className="text-sm text-slate-500">Loading complaints...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
            <PlusCircle className="text-slate-400 mb-3" size={32} />
            <h3 className="font-semibold text-slate-900 dark:text-white">No complaints filed yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              If you notice any defect in a local school, submit a photo report to alert local officials.
            </p>
            <Link 
              href="/report"
              className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all"
            >
              Report First Defect
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">Report ID</th>
                  <th className="px-6 py-4">School</th>
                  <th className="px-6 py-4">Issue</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date Filed</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 dark:text-white">
                      {c.report_id}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate">
                      {c.school_name || `School ID: ${c.school_id?.slice(0, 8)}...`}
                    </td>
                    <td className="px-6 py-4">
                      {c.category_name || "Infrastructure Defect"}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/track/${c.report_id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        Track
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
