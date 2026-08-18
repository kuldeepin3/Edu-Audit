/**
 * EduAudit AI - Report Tracking Page
 */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { statusConfig, severityColor, formatDate, timeAgo } from "@/lib/utils";

export default function TrackPage() {
  const params = useParams();
  const [searchId, setSearchId] = useState((params?.reportId as string) || "");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["track", searchId],
    queryFn: () => api.trackComplaint(searchId),
    enabled: searchId.length > 5,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
        Track Your Report
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Enter your report ID (e.g. RPT-20260624-00001) to see real-time status.
      </p>

      {/* Search */}
      <div className="mt-6 flex gap-2">
        <input
          type="text"
          className="input"
          placeholder="RPT-YYYYMMDD-XXXXX"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value.toUpperCase())}
        />
        <button className="btn-primary">
          <Search size={18} />
          Track
        </button>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="mt-8 text-center text-slate-500">Loading report...</div>
      )}

      {isError && (
        <div className="mt-8 rounded-lg bg-red-50 p-4 text-center text-red-700">
          Report not found. Please check your report ID.
        </div>
      )}

      {data && (
        <div className="mt-8 space-y-6">
          {/* Status Card */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">Report ID</div>
                <div className="font-display text-xl font-bold">{data.report_id}</div>
              </div>
              <span className={`badge ${statusConfig(data.status).color}`}>
                {statusConfig(data.status).label}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Severity</div>
                <span className={`badge mt-1 ${severityColor(data.severity_level)}`}>
                  {data.severity_level}
                </span>
              </div>
              <div>
                <div className="text-xs text-slate-500">Score</div>
                <div className="font-semibold">{data.severity_score}/10</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Filed</div>
                <div className="text-sm">{data.created_at ? timeAgo(data.created_at) : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Resolved</div>
                <div className="text-sm">
                  {data.resolved_at ? formatDate(data.resolved_at) : "Pending"}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {data.status_history?.length > 0 && (
            <div className="card">
              <h3 className="mb-4 font-display text-lg font-semibold">Status Timeline</h3>
              <div className="space-y-4">
                {[...data.status_history].reverse().map((entry, idx) => {
                  const sc = statusConfig(entry.new_status || entry.status);
                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${sc.color.split(" ")[0]}`} />
                        {idx < data.status_history.length - 1 && (
                          <div className="h-full w-0.5 flex-1 bg-slate-200" />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className={`badge ${sc.color}`}>{sc.label}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {entry.timestamp ? formatDate(entry.timestamp) : ""}
                        </div>
                        {entry.notes && (
                          <div className="mt-1 text-sm text-slate-600">{entry.notes}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
