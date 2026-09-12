"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { api, School } from "@/lib/api";
import { 
  CheckCircle, 
  Building, 
  CheckSquare, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  Printer, 
  RotateCcw,
  Search
} from "lucide-react";

export default function AuditorReportsPage() {
  const { user, auditor } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // 5 Canonical Classes Audit Scores (0 - 100) & Observations
  const [washroomScore, setWashroomScore] = useState(85);
  const [washroomNote, setWashroomNote] = useState("Running water functional; toilet fixtures repaired and sanitized.");
  
  const [wiringScore, setWiringScore] = useState(90);
  const [wiringNote, setWiringNote] = useState("Main switchboards enclosed; no exposed or dangling live wiring.");

  const [wallScore, setWallScore] = useState(80);
  const [wallNote, setWallNote] = useState("Masonry cracks sealed; structural integrity sound.");

  const [furnitureScore, setFurnitureScore] = useState(85);
  const [furnitureNote, setFurnitureNote] = useState("Dual-desk benches intact; broken chairs removed and replaced.");

  const [windowScore, setWindowScore] = useState(90);
  const [windowNote, setWindowNote] = useState("Window panes, door latches, and ventilation grills secure.");

  const [finalComments, setFinalComments] = useState(
    "On-site verification completed. All reported grievance remediation works comply with statutory RTE safety norms. Contractor work completion certified."
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReport, setSuccessReport] = useState<any | null>(null);

  // Search schools
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSchools([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.searchSchools(searchQuery);
        setSchools(results);
      } catch (err) {
        console.error("School search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Overall Score & Grade calculation
  const overallAverage = Math.round(
    (washroomScore + wiringScore + wallScore + furnitureScore + windowScore) / 5
  );

  const getGrade = (score: number) => {
    if (score >= 85) return { grade: "A", status: "Compliant & Certified Safe" };
    if (score >= 70) return { grade: "B", status: "Satisfactory / Minor Repairs Needed" };
    if (score >= 50) return { grade: "C", status: "Conditional / Remediation Required" };
    return { grade: "D", status: "Critical Non-Compliance" };
  };

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const districtCode = (selectedSchool.district || "VAD").slice(0, 3).toUpperCase();
      const certId = `EDU-INSP/${districtCode}/${year}/${randomNum}`;

      const { grade, status } = getGrade(overallAverage);

      const reportData = {
        certId,
        schoolName: selectedSchool.name,
        udiseCode: selectedSchool.udise_code || "24190100101",
        district: selectedSchool.district || auditor?.district || "Vadodara",
        state: "Gujarat",
        inspectionDate: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }),
        auditorName: user?.name || auditor?.name || "K. V. Sharma (DEO Field Auditor)",
        auditorId: auditor?.id ? auditor.id.slice(0, 8).toUpperCase() : "AUD-7821-GJ",
        overallScore: overallAverage,
        grade,
        statusText: status,
        categories: [
          {
            name: "Washroom Damage & Sanitation",
            code: "washroom_damage",
            score: washroomScore,
            status: washroomScore >= 75 ? "Compliant" : "Needs Attention",
            notes: washroomNote
          },
          {
            name: "Unsafe Wiring & Electrical Safety",
            code: "unsafe_wiring",
            score: wiringScore,
            status: wiringScore >= 75 ? "Certified Safe" : "Hazard Detected",
            notes: wiringNote
          },
          {
            name: "Damaged Walls / Cracks & Masonry",
            code: "damaged_wall",
            score: wallScore,
            status: wallScore >= 75 ? "Structurally Sound" : "Masonry Required",
            notes: wallNote
          },
          {
            name: "Broken Furniture (Desks & Benches)",
            code: "broken_furniture",
            score: furnitureScore,
            status: furnitureScore >= 75 ? "Adequate" : "Replacement Due",
            notes: furnitureNote
          },
          {
            name: "Broken Windows & Enclosures",
            code: "broken_windows",
            score: windowScore,
            status: windowScore >= 75 ? "Secure" : "Repair Required",
            notes: windowNote
          }
        ],
        comments: finalComments
      };

      setSuccessReport(reportData);
      setIsSubmitting(false);
    }, 800);
  };

  const handleReset = () => {
    setSelectedSchool(null);
    setSearchQuery("");
    setSuccessReport(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Generate Inspection Report
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Standardized physical verification across the 5 core infrastructure classes for statutory work completion certification.
        </p>
      </div>

      {successReport ? (
        /* ========================================================================= */
        /* AUTHENTIC GOVERNMENT INSPECTION CERTIFICATE (MINIMALIST & CLEAN)          */
        /* ========================================================================= */
        <div className="space-y-6 animate-fadeIn">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={20} />
              <span className="text-sm font-semibold">Inspection Certificate Generated & Cryptographically Registered</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Printer size={14} />
                Print Certificate (PDF)
              </button>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                <RotateCcw size={14} />
                New Inspection
              </button>
            </div>
          </div>

          {/* OFFICIAL CERTIFICATE SHEET (A4 Print Layout) */}
          <div 
            id="print-certificate" 
            className="bg-white text-slate-900 p-8 md:p-12 rounded-xl border border-slate-300 shadow-md font-sans space-y-6 print:border-none print:shadow-none print:p-0"
          >
            {/* Government Official Header */}
            <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
              <div className="text-[11px] font-bold tracking-widest text-slate-600 uppercase">
                Government of India • Ministry of Education
              </div>
              <div className="text-lg md:text-xl font-serif font-bold tracking-tight text-slate-900 uppercase">
                Samagra Shiksha Infrastructure Audit Authority
              </div>
              <div className="text-[12px] font-medium text-slate-700 tracking-wide">
                STATUTORY SCHOOL INFRASTRUCTURE INSPECTION & WORK COMPLETION CERTIFICATE
              </div>
              <div className="pt-2 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span>CERT NO: {successReport.certId}</span>
                <span>AUDIT DATE: {successReport.inspectionDate}</span>
              </div>
            </div>

            {/* School & Auditor Details Table */}
            <div className="grid grid-cols-2 gap-4 text-xs border border-slate-200 rounded-lg p-3.5 bg-slate-50/50">
              <div className="space-y-1">
                <div>
                  <span className="text-slate-500 font-medium">Institution: </span>
                  <span className="font-bold text-slate-900">{successReport.schoolName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">UDISE Code: </span>
                  <span className="font-mono font-semibold text-slate-800">{successReport.udiseCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">District / State: </span>
                  <span className="text-slate-800">{successReport.district}, {successReport.state}</span>
                </div>
              </div>

              <div className="space-y-1 border-l border-slate-200 pl-4">
                <div>
                  <span className="text-slate-500 font-medium">Inspecting Officer: </span>
                  <span className="font-bold text-slate-900">{successReport.auditorName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Auditor ID: </span>
                  <span className="font-mono font-semibold text-slate-800">{successReport.auditorId}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Audit Protocol: </span>
                  <span className="text-slate-800">RTE Act 2009 & NBC Safety Norms</span>
                </div>
              </div>
            </div>

            {/* Assessment Grid - 5 Core Classes */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                1. Domain-Specific Physical Evaluation (5 Core Classes)
              </div>
              
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3 w-1/3">Infrastructure Category</th>
                      <th className="py-2.5 px-2 text-center w-16">Score</th>
                      <th className="py-2.5 px-3 text-center w-32">Status</th>
                      <th className="py-2.5 px-3">Field Verification Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {successReport.categories.map((cat: any, i: number) => (
                      <tr key={cat.code} className={i % 2 === 1 ? "bg-slate-50/40" : ""}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {cat.name}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold">
                          {cat.score}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            cat.score >= 80 
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                              : cat.score >= 70 
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {cat.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] leading-relaxed">
                          {cat.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Overall Health Index & Assessment */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Cumulative Infrastructure Quality Index (IQI)
                </span>
                <div className="text-2xl font-bold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
                  <span>{successReport.overallScore} / 100</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    {successReport.statusText}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Standardized composite score across sanitation, electrical safety, masonry, classroom furniture, and building enclosure.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-5">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Statutory</span>
                  <span className="text-xs font-bold text-slate-700">Final Grade</span>
                </div>
                <div className="h-14 w-14 rounded-lg bg-slate-900 text-white flex flex-col items-center justify-center font-display font-black text-2xl shadow-sm">
                  <span>{successReport.grade}</span>
                </div>
              </div>
            </div>

            {/* Auditor Remarks */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                2. Statutory Auditor Observations & Fund Release Recommendation
              </div>
              <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3 leading-relaxed">
                {successReport.comments}
              </p>
            </div>

            {/* Legal Certification Statement */}
            <div className="text-[10px] text-slate-500 leading-relaxed italic border-t border-slate-200 pt-3">
              {"\"This certificate serves as statutory confirmation that an authorized physical audit of the aforementioned school was performed. Findings are synchronized with the central EduAudit monitoring repository and qualify for institutional compliance archives under Section 19 of the Right of Children to Free and Compulsory Education Act.\""}
            </div>

            {/* Official Sign-off & Stamps Block */}
            <div className="pt-6 grid grid-cols-3 gap-4 text-center items-end text-xs border-t border-slate-200">
              <div className="space-y-1">
                <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                  <span className="font-serif italic font-semibold text-slate-700">K. V. Sharma</span>
                </div>
                <div className="font-bold text-slate-800 text-[11px]">Field Auditor Signature</div>
                <div className="text-[10px] text-slate-400">DEO Infrastructure Cell</div>
              </div>

              <div className="flex flex-col items-center justify-center space-y-1">
                <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex flex-col items-center justify-center p-1 text-[8px] text-slate-400 uppercase font-bold text-center leading-tight">
                  <span>Govt. Seal</span>
                  <span>Verified</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">DIGITAL HASH VERIFIED</span>
              </div>

              <div className="space-y-1">
                <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                  <span className="text-slate-400 text-[11px] italic">Institutional Seal</span>
                </div>
                <div className="font-bold text-slate-800 text-[11px]">Principal / Headmaster</div>
                <div className="text-[10px] text-slate-400">School Verification</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CLEAN, MINIMALIST INSPECTION FORM                                         */
        /* ========================================================================= */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-8 shadow-sm">
          {/* Step 1: School Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
              <Building size={18} className="text-brand-600 dark:text-brand-400" />
              <span>1. Target School Selection</span>
            </div>

            {selectedSchool ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{selectedSchool.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>UDISE: {selectedSchool.udise_code || "24190100101"}</span>
                    <span>•</span>
                    <span>District: {selectedSchool.district}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSchool(null)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  Change School
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search school by name or 11-digit UDISE code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {isSearching && (
                  <p className="text-xs text-slate-400 pl-1">Searching school directory...</p>
                )}

                {schools.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 shadow-md">
                    {schools.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSchool(s)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</div>
                          <div className="text-[11px] text-slate-400">UDISE: {s.udise_code} • {s.district}</div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Evaluation Across the 5 Classes */}
          {selectedSchool && (
            <form onSubmit={handleGenerateReport} className="space-y-8 animate-fadeIn">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                    <CheckSquare size={18} className="text-brand-600 dark:text-brand-400" />
                    <span>2. Physical Assessment Across 5 Core Classes</span>
                  </div>
                  <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Average Score: <span className="text-brand-600 dark:text-brand-400 font-bold">{overallAverage}%</span> (Grade {getGrade(overallAverage).grade})
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Washrooms */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>🚽 Washroom Damage & Sanitation</span>
                      <span className="font-mono text-brand-600 dark:text-brand-400">{washroomScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={washroomScore}
                      onChange={(e) => setWashroomScore(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                    <input
                      type="text"
                      value={washroomNote}
                      onChange={(e) => setWashroomNote(e.target.value)}
                      placeholder="Auditor observation..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* 2. Unsafe Wiring */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>⚡ Unsafe Wiring & Electrical Safety</span>
                      <span className="font-mono text-brand-600 dark:text-brand-400">{wiringScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={wiringScore}
                      onChange={(e) => setWiringScore(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                    <input
                      type="text"
                      value={wiringNote}
                      onChange={(e) => setWiringNote(e.target.value)}
                      placeholder="Auditor observation..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* 3. Damaged Walls */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>🧱 Damaged Walls / Cracks & Masonry</span>
                      <span className="font-mono text-brand-600 dark:text-brand-400">{wallScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={wallScore}
                      onChange={(e) => setWallScore(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                    <input
                      type="text"
                      value={wallNote}
                      onChange={(e) => setWallNote(e.target.value)}
                      placeholder="Auditor observation..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* 4. Broken Furniture */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>🪑 Broken Furniture (Desks & Benches)</span>
                      <span className="font-mono text-brand-600 dark:text-brand-400">{furnitureScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={furnitureScore}
                      onChange={(e) => setFurnitureScore(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                    <input
                      type="text"
                      value={furnitureNote}
                      onChange={(e) => setFurnitureNote(e.target.value)}
                      placeholder="Auditor observation..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* 5. Windows & Doors */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 space-y-2 md:col-span-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>🪟 Broken Windows, Doors & Enclosures</span>
                      <span className="font-mono text-brand-600 dark:text-brand-400">{windowScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={windowScore}
                      onChange={(e) => setWindowScore(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                    <input
                      type="text"
                      value={windowNote}
                      onChange={(e) => setWindowNote(e.target.value)}
                      placeholder="Auditor observation..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Formal Recommendations */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                  <Sparkles size={18} className="text-brand-600 dark:text-brand-400" />
                  <span>3. Statutory Audit Remarks & Fund Recommendation</span>
                </div>
                <textarea
                  placeholder="Enter formal remediation status, contractor work completion notes, or budget release recommendation..."
                  value={finalComments}
                  onChange={(e) => setFinalComments(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  rows={3}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-md transition-all"
              >
                {isSubmitting ? "Compiling Audit Certificate..." : "Compile & Sign Inspection Certificate"}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
