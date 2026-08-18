"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Building,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";

const PIE_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#34d399"];

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

  const districtName = auditor?.district || "Your Assigned";

  // Calculate metrics
  const total = complaints.length;
  const pending = complaints.filter(c => ["submitted", "pending"].includes(c.status.toLowerCase())).length;
  const inProgress = complaints.filter(c => ["in_progress", "assigned", "pending_completion"].includes(c.status.toLowerCase())).length;
  const completed = complaints.filter(c => ["completed", "resolved"].includes(c.status.toLowerCase())).length;
  const critical = complaints.filter(c => c.severity_level.toLowerCase() === "critical").length;

  // Chart data 1: Severity distribution
  const severityData = [
    { name: "Critical", value: complaints.filter(c => c.severity_level.toLowerCase() === "critical").length },
    { name: "High", value: complaints.filter(c => c.severity_level.toLowerCase() === "high").length },
    { name: "Medium", value: complaints.filter(c => c.severity_level.toLowerCase() === "medium").length },
    { name: "Low", value: complaints.filter(c => c.severity_level.toLowerCase() === "low").length },
  ].filter(d => d.value > 0);

  // Chart data 2: Complaints by Category code
  const categoryCounts = complaints.reduce((acc: Record<string, number>, curr) => {
    const name = curr.category_name || curr.category_id || "Other";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const categoryData = Object.entries(categoryCounts).map(([name, count]) => ({
    name: name.length > 15 ? name.slice(0, 15) + "..." : name,
    count
  })).slice(0, 5);

  const stats = [
    { label: "Total Complaints", value: total, icon: ShieldAlert, color: "text-slate-400" },
    { label: "Pending Verification", value: pending, icon: Clock, color: "text-amber-400" },
    { label: "In Progress Repairs", value: inProgress, icon: AlertTriangle, color: "text-blue-400" },
    { label: "Resolved Defects", value: completed, icon: CheckCircle2, color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">
          District Audit Dashboard
        </h1>
        <p className="text-slate-400 mt-1">
          Review complaints and generate repair works order reports in {districtName} district
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500" />
          <span className="text-sm text-slate-400">Loading district stats...</span>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                    <Icon className={stat.color} size={20} />
                  </div>
                  <div className="text-3xl font-extrabold">{stat.value}</div>
                </div>
              );
            })}
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Severity distribution */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <h3 className="text-lg font-bold font-display mb-6">Severity Distribution</h3>
              {severityData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {severityData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", color: "#fff" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category counts */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <h3 className="text-lg font-bold font-display mb-6">Complaints by Category</h3>
              {categoryData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", color: "#fff" }} />
                    <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Critical Alerts and Quick Action List */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-display">Critical Issues Pending Review</h3>
                <p className="text-slate-500 text-sm">Action required immediately to authorize contractor repairs</p>
              </div>
              <Link 
                href="/portal/complaints" 
                className="text-sm font-semibold text-indigo-400 hover:underline flex items-center gap-1"
              >
                Review All <ArrowUpRight size={14} />
              </Link>
            </div>

            {complaints.filter(c => c.severity_level.toLowerCase() === "critical" && ["submitted", "pending"].includes(c.status.toLowerCase())).length === 0 ? (
              <div className="flex items-center justify-center py-6 text-slate-500 text-sm">
                No pending critical issues in your district! Nice work.
              </div>
            ) : (
              <div className="space-y-3">
                {complaints
                  .filter(c => c.severity_level.toLowerCase() === "critical" && ["submitted", "pending"].includes(c.status.toLowerCase()))
                  .slice(0, 3)
                  .map((c) => (
                    <div 
                      key={c.id} 
                      className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-900/40 text-red-400 rounded-lg shrink-0 mt-0.5">
                          <Building size={16} />
                        </div>
                        <div>
                          <div className="font-semibold">{c.school_name || "Government Primary School"}</div>
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-lg">{c.description || "No detail provided"}</p>
                          <div className="flex gap-2 text-[10px] text-slate-500 mt-1 font-medium">
                            <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded">ID: {c.report_id}</span>
                            <span>Category: {c.category_name || "Infra"}</span>
                          </div>
                        </div>
                      </div>
                      <Link 
                        href={`/portal/complaints?id=${c.id}`}
                        className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                      >
                        Inspect
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
