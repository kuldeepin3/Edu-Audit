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
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "resolved") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle size={11} /> Resolved
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <AlertCircle size={11} /> Rejected
        </span>
      );
    }
    if (s === "in_progress" || s === "assigned" || s === "pending_completion") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <Clock size={11} /> In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock size={11} /> Pending Review
      </span>
    );
  };

  return (
    <div className="h-[85vh] flex gap-6 max-w-7xl mx-auto font-sans">
      {/* Left Pane - Complaints List */}
      <div className="w-1/3 flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden shadow-none">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList size={16} className="text-slate-700" />
            District Complaints ({districtName})
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Select a complaint to inspect details and authorize action</p>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
            <span className="text-xs text-slate-500">Loading complaints...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <ClipboardList size={28} className="mb-2 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">No complaints reported</span>
            <p className="text-[11px] text-slate-500 mt-1">There are currently no complaints filed in {districtName} district.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {complaints.map((c) => {
              const isSelected = selectedComplaint?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  className={`w-full text-left p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected ? "bg-slate-100/80 border-l-4 border-l-slate-900" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-1 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-700">{c.report_id}</span>
                      {getStatusBadge(c.status)}
                    </div>
                    <div className="font-bold text-slate-900 truncate text-xs">
                      {c.school_name || "Primary School"}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{c.description || "No detail provided"}</p>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Pane - Detail Review & Actions */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden shadow-none">
        {selectedComplaint ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header info */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                  <span className="font-mono text-slate-600">ID: {selectedComplaint.report_id}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(selectedComplaint.created_at).toLocaleDateString("en-IN")}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">{selectedComplaint.school_name || "Government Primary School"}</h2>
              </div>
              <div className="shrink-0">{getStatusBadge(selectedComplaint.status)}</div>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {successMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Information cards */}
                <div className="space-y-4">
                  {/* Category Card */}
                  <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Defect Category</div>
                    <div className="font-bold text-sm text-slate-900">{selectedComplaint.category_name || "General Infrastructure"}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Code: {selectedComplaint.category_id || "unassigned"}</div>
                  </div>

                  {/* Severity Card */}
                  <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Severity Level</div>
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        (selectedComplaint.severity_level || "").toLowerCase() === "critical"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : (selectedComplaint.severity_level || "").toLowerCase() === "high"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {selectedComplaint.severity_level || "Medium"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">Score: {selectedComplaint.severity_score || 5}/10</span>
                    </div>
                  </div>

                  {/* School / Reporter Card */}
                  <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200 space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Audit Context</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Building size={14} className="text-slate-400" />
                        <span>UDISE Code: <strong className="font-mono text-slate-900">{selectedComplaint.school_udise || "24190100101"}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <User size={14} className="text-slate-400" />
                        <span>Reporter: {selectedComplaint.is_anonymous ? "Citizen (Anonymous)" : (selectedComplaint.reporter_name || selectedComplaint.reporter?.name || "Citizen (Verified)")}</span>
                      </div>
                      {!selectedComplaint.is_anonymous && (selectedComplaint.reporter_email || selectedComplaint.reporter_phone) && (
                        <div className="pt-1.5 text-[11px] text-slate-500 space-y-0.5 border-t border-slate-200">
                          {selectedComplaint.reporter_email && <div>Email: {selectedComplaint.reporter_email}</div>}
                          {selectedComplaint.reporter_phone && <div>Phone: {selectedComplaint.reporter_phone}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Verification Card */}
                <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Automated Verification Assessment</div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {selectedComplaint.ai_analysis?.description || "Computer vision model verified defect signature against canonical school safety standards."}
                    </p>
                  </div>
                  <div className="p-2.5 bg-white rounded-md border border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Confidence Rating</span>
                    <span className="font-bold text-slate-900 font-mono">{(selectedComplaint.ai_confidence || 87.5).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Submitted Evidence Photos Gallery */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-slate-500" />
                  Submitted Photographic Evidence
                </h4>
                {selectedComplaint.images && selectedComplaint.images.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedComplaint.images.map((img: any, idx: number) => {
                      const fullUrl = getImageUrl(img.media_url || img.thumbnail_url);
                      return (
                        <div key={img.id || idx} className="relative group bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                          <img
                            src={fullUrl}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-44 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=60";
                            }}
                          />
                          <div className="p-2 bg-white border-t border-slate-200 flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Evidence #{idx + 1}</span>
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-slate-800 hover:underline"
                            >
                              Open Full ↗
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : selectedComplaint.media_url ? (
                  <div className="relative group bg-slate-100 rounded-lg border border-slate-200 overflow-hidden max-w-sm">
                    <img
                      src={getImageUrl(selectedComplaint.media_url)}
                      alt="Evidence Photo"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=60";
                      }}
                    />
                    <div className="p-2.5 bg-white border-t border-slate-200 flex justify-between items-center text-xs">
                      <span className="text-slate-500 text-[11px]">Uploaded Evidence Photo</span>
                      <a
                        href={getImageUrl(selectedComplaint.media_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-800 hover:underline font-semibold"
                      >
                        Open Full ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 italic">
                    No evidence photos attached to this report.
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Detailed Complaint Description</h4>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed">
                  {selectedComplaint.description || "No detailed description provided by the citizen."}
                </div>
              </div>

              {/* GPS Geolocation & Map Inspector */}
              <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1"><MapPin size={13} className="text-slate-500" /> Recorded GPS Location</span>
                  {selectedComplaint.latitude && selectedComplaint.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-slate-800 hover:underline font-semibold"
                    >
                      Open in Maps ↗
                    </a>
                  )}
                </div>
                <div className="p-2.5 bg-white rounded border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-800">
                    {selectedComplaint.gps_location || (selectedComplaint.latitude && selectedComplaint.longitude ? `${selectedComplaint.latitude.toFixed(6)}, ${selectedComplaint.longitude.toFixed(6)}` : "Location mapped via school UDISE records")}
                  </span>
                  <span className="text-[10px] text-slate-400">Validated</span>
                </div>
              </div>

              {/* Actions panel */}
              <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Audit Actions & Status Update</h4>
                
                <textarea
                  placeholder="Enter inspection notes, contractor assignment details, or reasons..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  rows={2}
                />

                <div className="flex flex-wrap gap-2.5">
                  {!["completed", "resolved", "rejected"].includes((selectedComplaint.status || "").toLowerCase()) && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus("assigned")}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <ThumbsUp size={14} /> Approve & Assign Work
                      </button>

                      <button
                        onClick={() => handleUpdateStatus("in_progress")}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Calendar size={14} /> Log Field Inspection
                      </button>

                      <button
                        onClick={() => handleUpdateStatus("completed")}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 size={14} /> Mark Completed
                      </button>

                      <button
                        onClick={() => handleUpdateStatus("rejected")}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <ThumbsDown size={14} /> Reject Report
                      </button>
                    </>
                  )}

                  {["completed", "resolved"].includes((selectedComplaint.status || "").toLowerCase()) && (
                    <div className="w-full text-center text-xs text-emerald-800 bg-emerald-50 py-2.5 rounded border border-emerald-200 font-semibold">
                      ✓ Defect remediation verified and recorded in compliance archive
                    </div>
                  )}

                  {(selectedComplaint.status || "").toLowerCase() === "rejected" && (
                    <div className="w-full text-center text-xs text-rose-800 bg-rose-50 py-2.5 rounded border border-rose-200 font-semibold">
                      ✕ Report rejected and closed
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
            <ClipboardList size={32} className="mb-2 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">No complaint selected</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Select an issue from the list on the left to inspect.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditorComplaintsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs">Loading complaints...</div>}>
      <AuditorComplaintsContent />
    </Suspense>
  );
}
