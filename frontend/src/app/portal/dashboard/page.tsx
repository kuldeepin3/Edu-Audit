"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  ArrowUpRight,
  FileText,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function AuditorDashboard() {
  const { auditor } = useAuthStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!auditor) return;
      try {
        const res = await api.listComplaints({ page: 1, page_size: 100 });
        // Filter by auditor's district
        const districtComplaints = (res.items || []).filter(
          (c: any) => {
            const dist = (c.district || c.school?.district || c.ai_analysis?.district || "").toLowerCase();
            const audDist = (auditor.district || "").toLowerCase();
            return !audDist || !dist || dist.includes(audDist) || audDist.includes(dist);
          }
        );
        setComplaints(districtComplaints);
      } catch (err) {
        console.error("Error loading auditor dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [auditor]);

  const districtName = auditor?.district || "Vadodara";

  // Calculate metrics
  const total = complaints.length;
  const pending = complaints.filter(c => ["submitted", "pending"].includes((c.status || "").toLowerCase())).length;
  const inProgress = complaints.filter(c => ["in_progress", "assigned", "pending_completion"].includes((c.status || "").toLowerCase())).length;
  const completed = complaints.filter(c => ["completed", "resolved"].includes((c.status || "").toLowerCase())).length;

  // Severity counts
  const criticalCount = complaints.filter(c => (c.severity_level || "").toLowerCase() === "critical").length;
  const highCount = complaints.filter(c => (c.severity_level || "").toLowerCase() === "high").length;
  const medCount = complaints.filter(c => (c.severity_level || "").toLowerCase() === "medium").length;
  const lowCount = complaints.filter(c => (c.severity_level || "").toLowerCase() === "low").length;

  const critPct = total > 0 ? Math.round((criticalCount / total) * 100) : 0;
  const highPct = total > 0 ? Math.round((highCount / total) * 100) : 0;
  const medPct = total > 0 ? Math.round((medCount / total) * 100) : 0;
  const lowPct = total > 0 ? Math.round((lowCount / total) * 100) : 0;

  // Canonical Infrastructure Categories Mapping
  const CANONICAL_CATEGORIES = [
    { key: "washroom", name: "Washroom Damage & Sanitation", code: "washroom_damage" },
    { key: "wiring", name: "Unsafe Wiring & Electrical Safety", code: "unsafe_wiring" },
    { key: "wall", name: "Damaged Walls / Cracks & Masonry", code: "damaged_wall" },
    { key: "furniture", name: "Broken Furniture (Desks & Benches)", code: "broken_furniture" },
    { key: "windows", name: "Broken Windows & Enclosures", code: "broken_windows" },
  ];

  const getCategoryKey = (c: any) => {
    const text = `${c.category_name || ""} ${c.defect_type || ""} ${c.description || ""}`.toLowerCase();
    if (text.includes("washroom") || text.includes("toilet") || text.includes("sanitat") || text.includes("water") || text.includes("plumb")) return "washroom";
    if (text.includes("wire") || text.includes("electr") || text.includes("switch") || text.includes("shock")) return "wiring";
    if (text.includes("wall") || text.includes("crack") || text.includes("masonry") || text.includes("ceiling") || text.includes("plaster")) return "wall";
    if (text.includes("furniture") || text.includes("desk") || text.includes("bench") || text.includes("chair") || text.includes("table")) return "furniture";
    if (text.includes("window") || text.includes("door") || text.includes("glass") || text.includes("grill")) return "windows";
    return "wall";
  };

  const categoryCounts = CANONICAL_CATEGORIES.map(cat => {
    const count = complaints.filter(c => getCategoryKey(c) === cat.key).length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { ...cat, count, pct };
  });

  const stats = [
    { label: "Total Complaints", value: total, hint: "Reported school defects", icon: ShieldAlert, color: "text-slate-500" },
    { label: "Pending Verification", value: pending, hint: "Awaiting auditor review", icon: Clock, color: "text-amber-600" },
    { label: "In Progress Repairs", value: inProgress, hint: "Contractor engaged", icon: AlertTriangle, color: "text-blue-600" },
    { label: "Resolved Defects", value: completed, hint: "Work completion verified", icon: CheckCircle2, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Official Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Government of Gujarat • Education Infrastructure Cell
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            District Audit Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {districtName} District • Physical verification queue, hazard severity distribution, and works status.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/portal/reports"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <FileText size={14} />
            Generate Inspection Report
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          <span className="text-xs text-slate-500">Loading district audit records...</span>
        </div>
      ) : (
        <>
          {/* Stats Grid - Clean, Static Minimalist Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                    <Icon className={stat.color} size={16} />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">{stat.value}</div>
                  <p className="text-[11px] text-slate-500">{stat.hint}</p>
                </div>
              );
            })}
          </div>

          {/* Core Analytics: Clean Tabular Breakdowns (Minimalist & Static) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Severity Distribution */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Severity Distribution</h2>
                  <p className="text-[11px] text-slate-500">Hazard urgency categorization across all district records</p>
                </div>
                <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Total: {total}
                </span>
              </div>

              {/* Segmented Distribution Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="h-2.5 w-full rounded-md overflow-hidden flex bg-slate-100 border border-slate-200">
                  {critPct > 0 && <div style={{ width: `${critPct}%` }} className="bg-rose-500" title={`Critical: ${criticalCount}`} />}
                  {highPct > 0 && <div style={{ width: `${highPct}%` }} className="bg-amber-500" title={`High: ${highCount}`} />}
                  {medPct > 0 && <div style={{ width: `${medPct}%` }} className="bg-blue-500" title={`Medium: ${medCount}`} />}
                  {lowPct > 0 && <div style={{ width: `${lowPct}%` }} className="bg-emerald-500" title={`Low: ${lowCount}`} />}
                </div>
              </div>

              {/* Minimalist Structured Table */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                      <th className="py-2 px-3">Severity Level</th>
                      <th className="py-2 px-3 text-center w-16">Complaints</th>
                      <th className="py-2 px-3 text-center w-16">Share</th>
                      <th className="py-2 px-3">Standard SLA Protocol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px]">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        Critical
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{criticalCount}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">{critPct}%</td>
                      <td className="py-2 px-3 text-rose-700 text-[10px]">Immediate field barricade &lt;24h</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        High
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{highCount}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">{highPct}%</td>
                      <td className="py-2 px-3 text-amber-700 text-[10px]">Remediation order &lt;7 days</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        Medium
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{medCount}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">{medPct}%</td>
                      <td className="py-2 px-3 text-slate-600 text-[10px]">Scheduled batch repair &lt;15 days</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        Low
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{lowCount}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">{lowPct}%</td>
                      <td className="py-2 px-3 text-slate-500 text-[10px]">Routine maintenance</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Complaints by Infrastructure Category (5 Core Classes) */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Infrastructure Categories</h2>
                  <p className="text-[11px] text-slate-500">Distribution across the 5 canonical school evaluation domains</p>
                </div>
                <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  5 Classes
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {categoryCounts.map((cat) => (
                  <div key={cat.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[70%]">
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="font-bold text-slate-900">{cat.count}</span>
                        <span className="text-slate-400">({cat.pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        style={{ width: `${Math.max(cat.pct, cat.count > 0 ? 4 : 0)}%` }}
                        className="h-full bg-slate-800 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Critical Issues Pending Review */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden space-y-0">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Critical Issues Requiring Action</h2>
                <p className="text-[11px] text-slate-500">Priority defects requiring immediate physical inspection & work release</p>
              </div>
              <Link 
                href="/portal/complaints" 
                className="text-xs font-semibold text-slate-800 hover:text-slate-950 flex items-center gap-1 border border-slate-200 bg-white px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
              >
                <span>View All Complaints ({total})</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>

            {complaints.filter(c => (c.severity_level || "").toLowerCase() === "critical" && ["submitted", "pending"].includes((c.status || "").toLowerCase())).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-xs">
                <CheckCircle2 size={24} className="text-emerald-500 mb-1.5" />
                <span className="font-semibold text-slate-700">No Pending Critical Defects</span>
                <p className="text-slate-400 text-[11px] mt-0.5">All critical emergency complaints in {districtName} have been actioned.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {complaints
                  .filter(c => (c.severity_level || "").toLowerCase() === "critical" && ["submitted", "pending"].includes((c.status || "").toLowerCase()))
                  .slice(0, 4)
                  .map((c) => (
                    <div 
                      key={c.id} 
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {c.report_id}
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                            Critical Hazard
                          </span>
                          <span className="text-[11px] text-slate-500">• {c.category_name || "Infrastructure"}</span>
                        </div>
                        <div className="font-bold text-sm text-slate-900">
                          {c.school_name || "Government Primary School"}
                        </div>
                        <p className="text-xs text-slate-600 truncate max-w-xl">
                          {c.description || "Structural or electrical defect reported on campus grounds."}
                        </p>
                      </div>

                      <Link 
                        href={`/portal/complaints?id=${c.id}`}
                        className="self-start sm:self-center px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                      >
                        Inspect Defect
                      </Link>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
