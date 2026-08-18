"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { 
  FileText, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  PlusCircle 
} from "lucide-react";

export default function MyComplaintsPage() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComplaints() {
      if (!user) return;
      try {
        const data = await api.listComplaints({ page: 1, page_size: 50 });
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
    fetchComplaints();
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 transition-colors duration-200">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard"
          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            My Submitted Complaints
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Total {complaints.length} reports filed by you
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
            <span className="text-sm text-slate-500">Loading complaints...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="text-slate-400 mb-3" size={40} />
            <h3 className="font-semibold text-slate-900 dark:text-white">No complaints found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              All infrastructure reports you file in government schools will appear here.
            </p>
            <Link 
              href="/report"
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-md shadow-brand-500/10"
            >
              <PlusCircle size={16} /> File First Complaint
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">Report ID</th>
                  <th className="px-6 py-4">School</th>
                  <th className="px-6 py-4">Issue Description</th>
                  <th className="px-6 py-4">Severity</th>
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
                    <td className="px-6 py-4 max-w-sm truncate text-slate-600 dark:text-slate-400">
                      {c.description || "No description provided"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        c.severity_level.toLowerCase() === "critical"
                          ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                          : c.severity_level.toLowerCase() === "high"
                          ? "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"
                          : c.severity_level.toLowerCase() === "medium"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                          : "bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-400"
                      }`}>
                        {c.severity_level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/track/${c.report_id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        Details
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
