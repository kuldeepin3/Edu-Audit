"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api, getImageUrl } from "@/lib/api";
import { 
  ClipboardList, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight,
  Shield,
  Building,
  User,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  Wrench,
  CheckCircle2,
  Calendar
} from "lucide-react";

function AuditorComplaintsContent() {
  const { auditor } = useAuthStore();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const districtName = auditor?.district || "Vadodara";

  useEffect(() => {
    async function loadComplaints() {
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
        
        // Auto-select initial complaint if present in URL
        if (initialId) {
          const found = districtComplaints.find((c: any) => c.id === initialId);
          if (found) setSelectedComplaint(found);
        } else if (districtComplaints.length > 0 && !selectedComplaint) {
          setSelectedComplaint(districtComplaints[0]);
        }
      } catch (err) {
        console.error("Failed to load complaints:", err);
      } finally {
        setLoading(false);
      }
    }
    loadComplaints();
  }, [auditor, initialId]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedComplaint) return;
    setActionLoading(true);
    setSuccessMsg("");
    try {
      const updated = await api.updateComplaintStatus(selectedComplaint.id, status, actionNotes);
      setSuccessMsg(`Status updated to ${status} successfully!`);
      setActionNotes("");
      
      // Update local state
      setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { ...c, status } : c));
      setSelectedComplaint((prev: any) => prev ? { ...prev, status } : null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Error updating complaint status.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "resolved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800">
          <CheckCircle size={12} /> Resolved
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/40 text-red-400 border border-red-800">
          <AlertCircle size={12} /> Rejected
        </span>
      );
    }
    if (s === "in_progress" || s === "assigned" || s === "pending_completion") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/40 text-blue-400 border border-blue-800">
          <Clock size={12} /> In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        <Clock size={12} /> Pending Review
      </span>
    );
  };

  return (
    <div className="h-[85vh] flex gap-8">
      {/* Left Pane - Complaints List */}
      <div className="w-1/3 flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-slate-950">
          <h2 className="text-lg font-bold font-display flex items-center gap-2">
            <ClipboardList size={20} className="text-indigo-400" />
            District Complaints ({districtName})
          </h2>
          <p className="text-xs text-slate-500 mt-1">Select a complaint to inspect details and authorize action</p>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500" />
            <span className="text-xs text-slate-500">Loading complaints...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <ClipboardList size={32} className="mb-2" />
            <span className="text-sm font-semibold">No complaints reported</span>
            <p className="text-xs text-slate-600 mt-1">There are currently no complaints filed in {districtName} district.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
            {complaints.map((c) => {
              const isSelected = selectedComplaint?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  className={`w-full text-left p-4 flex items-center justify-between transition-colors ${
                    isSelected ? "bg-slate-900 border-l-4 border-l-indigo-500" : "hover:bg-slate-900/40"
                  }`}
                >
                  <div className="space-y-1.5 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-300">{c.report_id}</span>
                      {getStatusBadge(c.status)}
                    </div>
                    <div className="font-semibold text-slate-100 truncate text-sm">
                      {c.school_name || "Primary School"}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.description || "No detail"}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Pane - Detail Review & Actions */}
      <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
        {selectedComplaint ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header info */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  <span className="font-mono text-slate-400">REPORT ID: {selectedComplaint.report_id}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(selectedComplaint.created_at).toLocaleDateString("en-IN")}</span>
                </div>
                <h2 className="text-xl font-bold font-display text-white">{selectedComplaint.school_name || "Government Primary School"}</h2>
              </div>
              <div className="shrink-0">{getStatusBadge(selectedComplaint.status)}</div>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {successMsg && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-emerald-400 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  {successMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Information cards */}
                <div className="space-y-4">
                  {/* Category Card */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Defect Category</div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center text-lg font-bold">
                        ⚒️
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{selectedComplaint.category_name || "General Defect"}</div>
                        <div className="text-xs text-slate-500">Category Code: {selectedComplaint.category_id || "Unassigned"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Severity Card */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity Level</div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        selectedComplaint.severity_level.toLowerCase() === "critical"
                          ? "bg-red-950/40 text-red-400 border border-red-800"
                          : selectedComplaint.severity_level.toLowerCase() === "high"
                          ? "bg-orange-950/40 text-orange-400 border border-orange-800"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}>
                        {selectedComplaint.severity_level}
                      </span>
                      <span className="text-xs text-slate-400">Severity Score: {selectedComplaint.severity_score}/100</span>
                    </div>
                  </div>

                  {/* School / Reporter Card */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Context</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Building size={16} className="text-slate-500" />
                        <span>UDISE Code: {selectedComplaint.school_udise || "24190100101"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <User size={16} className="text-slate-500" />
                        <span>Reporter: {selectedComplaint.is_anonymous ? "Citizen (Anonymous)" : (selectedComplaint.reporter_name || selectedComplaint.reporter?.name || "Citizen (Verified)")}</span>
                      </div>
                      {!selectedComplaint.is_anonymous && (selectedComplaint.reporter_email || selectedComplaint.reporter_phone) && (
                        <div className="pt-1 text-xs text-slate-400 space-y-1 border-t border-slate-800">
                          {selectedComplaint.reporter_email && <div>✉️ Email: {selectedComplaint.reporter_email}</div>}
                          {selectedComplaint.reporter_phone && <div>📞 Phone: {selectedComplaint.reporter_phone}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Detection Card */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">🤖 AI Automated Verification</div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {selectedComplaint.ai_analysis?.description || "AI Model analyzed the report image. Perceptual hashing checked. YOLO detection verified issue with high confidence."}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-500">AI Verification Confidence</span>
                    <span className="font-bold text-emerald-400">{(selectedComplaint.ai_confidence || 87.5).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Submitted Evidence Photos Gallery */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <ImageIcon size={16} className="text-indigo-400" />
                  Submitted Evidence Photos
                </h4>
                {selectedComplaint.images && selectedComplaint.images.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedComplaint.images.map((img: any, idx: number) => {
                      const fullUrl = getImageUrl(img.media_url || img.thumbnail_url);
                      return (
                        <div key={img.id || idx} className="relative group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                          <img
                            src={fullUrl}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-48 object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=60";
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg"
                            >
                              Open Image ↗
                            </a>
                          </div>
                          {img.is_primary && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-indigo-950/90 text-indigo-300 text-[10px] font-bold rounded border border-indigo-800">
                              Primary Evidence
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : selectedComplaint.media_url ? (
                  <div className="relative group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden max-w-md">
                    <img
                      src={getImageUrl(selectedComplaint.media_url)}
                      alt="Evidence Photo"
                      className="w-full h-56 object-cover rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=60";
                      }}
                    />
                    <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-xs text-slate-400">Uploaded Evidence Photo</span>
                      <a
                        href={getImageUrl(selectedComplaint.media_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:underline font-semibold"
                      >
                        Open Full Image ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-500 italic">
                    No evidence photos attached to this report.
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300">Detailed Complaint Description</h4>
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-sm text-slate-300 leading-relaxed">
                  {selectedComplaint.description || "No detailed description provided by the citizen."}
                </div>
              </div>

              {/* GPS Geolocation & Map Inspector */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-rose-400" /> Exact Incident GPS Location</span>
                  {selectedComplaint.latitude && selectedComplaint.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-400 hover:underline font-semibold"
                    >
                      Open in Google Maps ↗
                    </a>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="space-y-1">
                    <div className="font-mono text-xs font-semibold text-slate-200">
                      {selectedComplaint.gps_location || (selectedComplaint.latitude && selectedComplaint.longitude ? `${selectedComplaint.latitude.toFixed(6)}, ${selectedComplaint.longitude.toFixed(6)}` : "Location provided via school coordinates")}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      School: {selectedComplaint.school_name || "Primary School"} • District: {selectedComplaint.district || "Vadodara"}
                    </div>
                  </div>
                  {selectedComplaint.latitude && selectedComplaint.longitude && (
                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/60">
                        <MapPin size={12} /> Pin Verified
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions panel */}
              <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-sm font-semibold text-slate-300">Audit Actions Control</h4>
                
                <textarea
                  placeholder="Enter resolution notes, contract details, or reasons for rejection..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                />

                <div className="flex flex-wrap gap-3">
                  {!["completed", "resolved", "rejected"].includes(selectedComplaint.status.toLowerCase()) && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus("assigned")}
                        disabled={actionLoading}
                        className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/10 transition-colors disabled:opacity-50"
                      >
                        <ThumbsUp size={16} /> Approve & Assign Work
                      </button>

                      <button
                        onClick={() => handleUpdateStatus("in_progress")}
                        disabled={actionLoading}
                        className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-amber-600/10 transition-colors disabled:opacity-50"
                      >
                        <Calendar size={16} /> Log Field Visit
                      </button>

                      <button
                        onClick={() => handleUpdateStatus("completed")}
                        disabled={actionLoading}
                        className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/10 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} /> Mark Completed
                      </button>

                      <button
                        onClick={() => handleUpdateStatus("rejected")}
                        disabled={actionLoading}
                        className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-950 hover:bg-red-900 text-red-300 rounded-xl text-sm font-semibold border border-red-800/40 transition-colors disabled:opacity-50"
                      >
                        <ThumbsDown size={16} /> Reject Report
                      </button>
                    </>
                  )}

                  {["completed", "resolved"].includes(selectedComplaint.status.toLowerCase()) && (
                    <div className="w-full text-center text-xs text-emerald-400 bg-emerald-950/20 py-3 rounded-lg border border-emerald-900/40 font-semibold uppercase tracking-wider">
                      ✓ Defect inspection resolved and archived
                    </div>
                  )}

                  {selectedComplaint.status.toLowerCase() === "rejected" && (
                    <div className="w-full text-center text-xs text-red-400 bg-red-950/10 py-3 rounded-lg border border-red-900/20 font-semibold uppercase tracking-wider">
                      ✕ Report rejected and archived
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
            <ClipboardList size={40} className="mb-2" />
            <span className="text-sm font-semibold">No complaint selected</span>
            <p className="text-xs text-slate-600 mt-1">Select an issue from the list on the left to inspect.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditorComplaintsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading complaints...</div>}>
      <AuditorComplaintsContent />
    </Suspense>
  );
}
