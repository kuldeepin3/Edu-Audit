"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Clock, ShieldCheck, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { statusConfig, severityColor, formatDate, timeAgo } from "@/lib/utils";

export default function TrackMainPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialId = searchParams.get("id") || "";

  const [inputVal, setInputVal] = useState(initialId);
  const [activeReportId, setActiveReportId] = useState(initialId);

  useEffect(() => {
    if (initialId) {
      setInputVal(initialId);
      setActiveReportId(initialId);
    }
  }, [initialId]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["track", activeReportId],
    queryFn: () => api.trackComplaint(activeReportId),
    enabled: activeReportId.trim().length >= 4,
    retry: 1,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputVal.trim().toUpperCase();
    if (cleaned) {
      setActiveReportId(cleaned);
      router.push(`/track?id=${encodeURIComponent(cleaned)}`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-8 transition-colors duration-200">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 mx-auto border border-brand-100 dark:border-brand-900/30 shadow-sm">
          <Search size={24} />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">
          Track Infrastructure Report
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          Enter your unique Report ID (e.g., <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-brand-600 dark:text-brand-400">RPT-20260728-00001</code>) to track verification and repair progress.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <FileText size={18} />
          </div>
          <input
            type="text"
            required
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Enter Report ID (RPT-YYYYMMDD-XXXXX)..."
            className="w-full pl-11 pr-4 py-3.5 border border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 shrink-0"
        >
          <Search size={18} />
          Track Status
        </button>
      </form>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
          <span className="text-sm text-slate-500 font-medium">Fetching report timeline...</span>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-2xl text-center space-y-2">
          <AlertTriangle className="text-red-500 mx-auto" size={28} />
          <h3 className="font-semibold text-red-900 dark:text-red-300">Report Not Found</h3>
          <p className="text-xs text-red-700 dark:text-red-400 max-w-sm mx-auto">
            No complaint record matched ID &quot;<span className="font-mono font-bold">{activeReportId}</span>&quot;. Please verify the report number and try again.
          </p>
        </div>
      )}

      {/* Result Display */}
      {data && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Status Overview Card */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Official Report ID</span>
                <span className="font-mono text-xl font-extrabold text-slate-900 dark:text-white">{data.report_id}</span>
              </div>
              <div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig(data.status).color}`}>
                  <ShieldCheck size={14} />
                  {statusConfig(data.status).label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-medium block">Severity</span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold capitalize ${severityColor(data.severity_level)}`}>
                  {data.severity_level}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-medium block">Severity Score</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{data.severity_score}/10</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-medium block">Filed On</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {data.created_at ? timeAgo(data.created_at) : "—"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-medium block">Resolution</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {data.resolved_at ? formatDate(data.resolved_at) : "Pending"}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Card */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={20} className="text-brand-600" />
              Audit Progress Timeline
            </h3>

            {data.status_history && data.status_history.length > 0 ? (
              <div className="space-y-6 relative pl-6 border-l-2 border-slate-200 dark:border-slate-800">
                {[...data.status_history].reverse().map((entry: any, idx: number) => {
                  const sc = statusConfig(entry.new_status || entry.status);
                  return (
                    <div key={idx} className="relative space-y-1">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-brand-600 border-2 border-white dark:border-slate-950 shadow-sm" />
                      <div className="flex items-center justify-between">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${sc.color}`}>
                          {sc.label}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {entry.timestamp ? formatDate(entry.timestamp) : ""}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 pt-1 leading-relaxed">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm">
                Complaint submitted. Awaiting auditor review and inspection assignment.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
