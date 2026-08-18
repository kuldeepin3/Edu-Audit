"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { api, School } from "@/lib/api";
import { 
  FileText, 
  Search, 
  CheckCircle, 
  Calendar,
  Building,
  CheckSquare,
  Sparkles,
  ArrowRight,
  ChevronRight
} from "lucide-react";

export default function AuditorReportsPage() {
  const { user, auditor } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Form Fields
  const [grade, setGrade] = useState("B");
  const [toiletScore, setToiletScore] = useState(80);
  const [waterScore, setWaterScore] = useState(85);
  const [classroomScore, setClassroomScore] = useState(75);
  const [finalComments, setFinalComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReport, setSuccessReport] = useState<any | null>(null);

  // Search schools when query changes
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSchools([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.searchSchools(searchQuery);
        // Filter schools in auditor's district
        const districtSchools = results.filter(
          (s) => (s.district || "").toLowerCase() === (auditor?.district || "Vadodara").toLowerCase()
        );
        setSchools(districtSchools);
      } catch (err) {
        console.error("School search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, auditor]);

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;

    setIsSubmitting(true);
    setTimeout(() => {
      // Simulate API saving and report generation
      const mockReport = {
        id: "INF-REP-" + Math.floor(100000 + Math.random() * 900000),
        schoolName: selectedSchool.name,
        udiseCode: selectedSchool.udise_code || "24190100101",
        date: new Date().toLocaleDateString("en-IN"),
        inspector: user?.name || "DEO Officer",
        grade,
        metrics: {
          toilet: toiletScore,
          water: waterScore,
          classroom: classroomScore,
          average: Math.round((toiletScore + waterScore + classroomScore) / 3),
        },
        comments: finalComments,
      };

      setSuccessReport(mockReport);
      setIsSubmitting(false);
    }, 1500);
  };

  const handleReset = () => {
    setSelectedSchool(null);
    setSearchQuery("");
    setGrade("B");
    setToiletScore(80);
    setWaterScore(85);
    setClassroomScore(75);
    setFinalComments("");
    setSuccessReport(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 transition-colors duration-200">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Generate Inspection Report</h1>
        <p className="text-slate-400 mt-1">
          Perform a standardized infrastructure audit and generate signed inspection work certificates
        </p>
      </div>

      {successReport ? (
        /* SUCCESS SCREEN - Generated PDF simulation */
        <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 space-y-8 animate-fadeIn">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle size={28} />
            <div>
              <h3 className="text-xl font-bold font-display">Inspection Report Generated Successfully!</h3>
              <p className="text-slate-500 text-xs mt-0.5">Assigned Report ID: {successReport.id}</p>
            </div>
          </div>

          {/* Simulated Printed Report Document */}
          <div className="bg-white text-slate-900 p-8 rounded-xl font-sans border-t-8 border-t-indigo-600 shadow-2xl space-y-8">
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-lg font-bold font-display text-indigo-950 uppercase tracking-wide">Infrastructure Quality Audit</h2>
                <div className="text-xs text-slate-500 mt-1">Education Audit Department • Govt. of India</div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-bold font-mono rounded">
                  {successReport.id}
                </span>
                <div className="text-[10px] text-slate-400 mt-1">Generated: {successReport.date}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Audited School</span>
                <span className="font-bold text-slate-800">{successReport.schoolName}</span>
                <span className="block text-xs text-slate-500 mt-0.5">UDISE Code: {successReport.udiseCode}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Lead Auditor</span>
                <span className="font-bold text-slate-800">{successReport.inspector}</span>
                <span className="block text-xs text-slate-500 mt-0.5">District Designation: DEO Auditor</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="border-y border-slate-100 py-6 space-y-4">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Infrastructure Scores</span>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <div className="text-xs text-slate-400">Sanitation / Toilets</div>
                  <div className="text-lg font-bold text-indigo-950 mt-1">{successReport.metrics.toilet}%</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <div className="text-xs text-slate-400">Drinking Water</div>
                  <div className="text-lg font-bold text-indigo-950 mt-1">{successReport.metrics.water}%</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <div className="text-xs text-slate-400">Classrooms</div>
                  <div className="text-lg font-bold text-indigo-950 mt-1">{successReport.metrics.classroom}%</div>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-center">
                  <div className="text-xs text-indigo-950 font-semibold">Overall Score</div>
                  <div className="text-lg font-extrabold text-indigo-600 mt-1">{successReport.metrics.average}%</div>
                </div>
              </div>
            </div>

            {/* Grade Badge */}
            <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-xl">
              <div className="h-16 w-16 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-display font-extrabold text-3xl shadow-md shrink-0">
                {successReport.grade}
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Final Infrastructure Assessment Grade</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Based on physical audit parameters. This grade authorizes priorities for funding and contractor allocations.
                </p>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Final Recommendations</span>
              <p className="text-sm text-slate-700 italic border-l-4 border-l-indigo-200 pl-4 py-1 leading-relaxed">
                {successReport.comments || "No additional comments noted."}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="flex-1 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
            >
              Print Document (PDF)
            </button>
            <button
              onClick={handleReset}
              className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
            >
              New Audit Report
            </button>
          </div>
        </div>
      ) : (
        /* AUDIT FORM STEP */
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-8">
          {/* School Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold font-display flex items-center gap-2">
              <Building size={20} className="text-indigo-400" />
              1. Select Inspected School
            </h3>

            {selectedSchool ? (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-bold text-slate-100">{selectedSchool.name}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>UDISE: {selectedSchool.udise_code || "24190100101"}</span>
                    <span>•</span>
                    <span>District: {selectedSchool.district}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSchool(null)}
                  className="text-xs font-semibold text-red-400 hover:underline"
                >
                  Change School
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search schools by name or UDISE code in Vadodara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                {isSearching && (
                  <div className="text-xs text-slate-500">Searching school database...</div>
                )}

                {schools.length > 0 && (
                  <div className="border border-slate-800 bg-slate-900/50 rounded-xl divide-y divide-slate-800 max-h-48 overflow-y-auto">
                    {schools.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSchool(s)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-800 text-sm flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{s.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">UDISE: {s.udise_code} • {s.district}</div>
                        </div>
                        <ChevronRight size={14} className="text-slate-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedSchool && (
            /* Parameters inputs */
            <form onSubmit={handleGenerateReport} className="space-y-8 animate-fadeIn">
              <div className="space-y-6">
                <h3 className="text-lg font-bold font-display flex items-center gap-2">
                  <CheckSquare size={20} className="text-indigo-400" />
                  2. Infrastructure Parameter Scores
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Toilet Score */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                      <span>SANITATION / TOILETS</span>
                      <span className="text-indigo-400 font-bold">{toiletScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={toiletScore}
                      onChange={(e) => setToiletScore(Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Water Score */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                      <span>DRINKING WATER</span>
                      <span className="text-indigo-400 font-bold">{waterScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={waterScore}
                      onChange={(e) => setWaterScore(Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Classroom Score */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                      <span>CLASSROOM REPAIRS</span>
                      <span className="text-indigo-400 font-bold">{classroomScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={classroomScore}
                      onChange={(e) => setClassroomScore(Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Grade Selector */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Assigned Grade</label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="A">Grade A (Excellent Infrastructure)</option>
                      <option value="B">Grade B (Good but Minor Defects)</option>
                      <option value="C">Grade C (Requires Prompt Repairs)</option>
                      <option value="D">Grade D (Severe Degradation)</option>
                      <option value="F">Grade F (Condemned Infrastructure)</option>
                    </select>
                  </div>

                  {/* Date of inspection (auto filled) */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-center">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Audit Session Date</label>
                    <div className="flex items-center gap-2 text-sm text-slate-300 font-medium py-1">
                      <Calendar size={16} className="text-slate-500" />
                      <span>{new Date().toLocaleDateString("en-IN")} (Today)</span>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold font-display flex items-center gap-2">
                    <Sparkles size={20} className="text-indigo-400" />
                    3. Auditor Final Recommendations
                  </h3>
                  <textarea
                    placeholder="Enter school repair works request, budget request notes, or critical remarks..."
                    value={finalComments}
                    onChange={(e) => setFinalComments(e.target.value)}
                    className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={4}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-xl shadow-indigo-600/10 transition-all"
              >
                {isSubmitting ? "Generating Quality Audit..." : "Compile and Sign Inspection Certificate"}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
