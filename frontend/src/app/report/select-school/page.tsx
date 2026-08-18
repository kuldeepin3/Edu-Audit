"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Award, BookOpen, Building, ArrowLeft, Loader2 } from "lucide-react";
import { api, School } from "@/lib/api";
import { useSchoolStore } from "@/store/schoolStore";
import { cn } from "@/lib/utils";

export default function SelectSchoolPage() {
  const router = useRouter();
  const { selectedSchool, setSelectedSchool } = useSchoolStore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch schools when debounced term changes
  useEffect(() => {
    if (debouncedTerm.trim().length < 2) {
      setSchools([]);
      return;
    }

    const fetchSchools = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await api.searchSchools(debouncedTerm);
        setSchools(results);
      } catch (err) {
        console.error("Search error:", err);
        setError("Failed to fetch schools. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchools();
  }, [debouncedTerm]);

  const handleSelectSchool = (school: School) => {
    setSelectedSchool({
      id: school.id,
      name: school.name,
      udise_code: school.udise_code,
      address: school.address,
      school_type: school.school_type,
      health_score: school.health_score,
      health_grade: school.health_grade,
      district: school.district,
      latitude: school.latitude,
      longitude: school.longitude,
    });
    router.push("/report");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back navigation */}
      <button
        onClick={() => router.push("/report")}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Report Form
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
          Find Government School
        </h1>
        <p className="mt-2 text-slate-600">
          Search and select a school from Gujarat (currently Vadodara district) to file the report.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>
        <input
          type="text"
          className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none text-slate-800 font-medium placeholder-slate-400 bg-white shadow-sm transition-all text-base"
          placeholder="Search by school name or UDISE code (e.g. Lilipura)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {isLoading && schools.length === 0 ? (
          // Loading Skeletons
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white border-2 border-slate-100 rounded-2xl p-6 animate-pulse space-y-3">
              <div className="h-6 bg-slate-200 rounded-md w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded-md w-1/2"></div>
              <div className="flex gap-4 pt-2">
                <div className="h-5 bg-slate-200 rounded-md w-24"></div>
                <div className="h-5 bg-slate-200 rounded-md w-32"></div>
              </div>
            </div>
          ))
        ) : error ? (
          // Error Display
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">
            <p className="font-medium">{error}</p>
          </div>
        ) : schools.length > 0 ? (
          // Schools List
          schools.map((school) => {
            const isSelected = selectedSchool?.id === school.id;
            return (
              <div
                key={school.id}
                onClick={() => handleSelectSchool(school)}
                className={cn(
                  "group relative cursor-pointer overflow-hidden rounded-2xl border-2 p-6 transition-all bg-white hover:shadow-md hover:border-brand-300",
                  isSelected
                    ? "border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/10"
                    : "border-slate-100"
                )}
              >
                {/* Highlight Badge for selection */}
                {isSelected && (
                  <span className="absolute top-0 right-0 rounded-bl-xl bg-brand-500 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                    Selected
                  </span>
                )}

                <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors pr-20">
                  {school.name}
                </h3>
                
                {school.address && (
                  <p className="mt-1 flex items-start gap-1 text-sm text-slate-500">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>{school.address}</span>
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 items-center text-xs">
                  {/* UDISE Code Pill */}
                  {school.udise_code && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                      UDISE: {school.udise_code}
                    </span>
                  )}

                  {/* District Badge */}
                  {school.district && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">
                      <Building size={12} />
                      {school.district}
                    </span>
                  )}

                  {/* School Type Badge */}
                  {school.school_type && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 capitalize">
                      <BookOpen size={12} />
                      {school.school_type.replace("_", " ")}
                    </span>
                  )}

                  {/* Health Score Badge */}
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
                    school.health_score >= 80 
                      ? "bg-emerald-50 text-emerald-700" 
                      : school.health_score >= 50 
                        ? "bg-amber-50 text-amber-700" 
                        : "bg-red-50 text-red-700"
                  )}>
                    <Award size={12} />
                    Health Score: {school.health_score} ({school.health_grade || "N/A"})
                  </span>
                </div>
              </div>
            );
          })
        ) : debouncedTerm.trim().length >= 2 ? (
          // Empty State
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No schools found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              We couldn&apos;t find any schools matching &quot;{debouncedTerm}&quot; in Vadodara district. Try searching with a different name or UDISE code.
            </p>
          </div>
        ) : (
          // Initial State
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4 animate-pulse">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Start typing to search</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              Enter at least 2 characters of the school name or UDISE code to begin searching.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
