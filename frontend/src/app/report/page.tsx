/**
 * EduAudit AI - Report Submission Page
 * Citizens upload photos, choose category, submit complaints
 */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Camera, Upload, MapPin, Send, X, CheckCircle, Loader2 } from "lucide-react";
import { api, CATEGORIES } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSchoolStore } from "@/store/schoolStore";
import DynamicMap from "@/components/DynamicMap";

export default function ReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const { selectedSchool, clearSelectedSchool } = useSchoolStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationPrivacy, setLocationPrivacy] = useState<'exact' | 'approx' | 'hide'>('exact');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  // Get user location
  const getLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsLoadingLocation(false);
        },
        (err) => {
          console.error("Location error:", err);
          alert("Could not get location. Please allow location access in your browser.");
          setIsLoadingLocation(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  // Handle image selection
  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    const newImages = Array.from(files).slice(0, 5);
    setImages((prev) => [...prev, ...newImages].slice(0, 5));

    newImages.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Auto-analyze first image
    if (images.length === 0 && newImages[0]) {
      const catName = selectedCategory ? CATEGORIES.find(c => c.code === selectedCategory)?.name : undefined;
      analyzeImage(newImages[0], catName);
    }
  };

  // AI image analysis
  const analyzeMutation = useMutation({
    mutationFn: ({ file, category }: { file: File; category?: string }) => api.analyzeImage(file, category),
    onSuccess: (data) => {
      setAiAnalysis(data);
      if (data.primary_class && !selectedCategory) {
        // Auto-select category based on AI
        const cat = CATEGORIES.find((c) =>
          data.primary_class.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
        );
        if (cat) setSelectedCategory(cat.code);
      }
    },
  });

  const analyzeImage = (file: File, category?: string) => analyzeMutation.mutate({ file, category });

  const handleCategorySelect = (categoryCode: string) => {
    setSelectedCategory(categoryCode);
    if (images.length > 0) {
      const catName = CATEGORIES.find((c) => c.code === categoryCode)?.name;
      analyzeImage(images[0], catName);
    }
  };

  // School search
  const searchMutation = useMutation({
    mutationFn: (query: string) => api.searchSchools(query),
  });

  // Submit complaint
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("description", description);
      formData.append("school_id", selectedSchool?.id || "");
      formData.append("category_code", selectedCategory);
      formData.append("is_anonymous", String(isAnonymous));
      
      if (location && locationPrivacy !== 'hide') {
        if (locationPrivacy === 'approx') {
           // Add jitter (~1km)
           const jitterLat = location.lat + (Math.random() - 0.5) * 0.01;
           const jitterLng = location.lng + (Math.random() - 0.5) * 0.01;
           formData.append("latitude", String(jitterLat));
           formData.append("longitude", String(jitterLng));
        } else {
           formData.append("latitude", String(location.lat));
           formData.append("longitude", String(location.lng));
        }
      }
      
      images.forEach((img) => formData.append("images", img));
      return api.createComplaint(formData);
    },
    onSuccess: (data) => {
      clearSelectedSchool();
      router.push(`/track/${data.report_id}`);
    },
  });

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          Report an Infrastructure Issue
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Help improve your school. Your report will be analyzed by AI and routed to authorities.
        </p>
      </div>

      {/* Step 1: School Selection */}
      <section className="card mb-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-700">
            1
          </span>
          Select School
        </h2>
        {selectedSchool ? (
          <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display font-bold text-slate-800">{selectedSchool.name}</h3>
                {selectedSchool.address && (
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedSchool.address}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 items-center text-xs">
                  {selectedSchool.udise_code && (
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                      UDISE: {selectedSchool.udise_code}
                    </span>
                  )}
                  {selectedSchool.district && (
                    <span className="inline-flex rounded-md bg-brand-100/50 px-2 py-0.5 font-semibold text-brand-700">
                      {selectedSchool.district}
                    </span>
                  )}
                  {selectedSchool.health_score !== undefined && (
                    <span className="inline-flex rounded-md bg-emerald-100/50 px-2 py-0.5 font-semibold text-emerald-700">
                      Score: {selectedSchool.health_score} ({selectedSchool.health_grade || "N/A"})
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push("/report/select-school")}
                className="btn-secondary py-1.5 px-3 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-brand-600 font-semibold shrink-0 ml-4"
              >
                Change School
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-sm text-slate-500 mb-3">No school selected for this report</p>
            <button
              onClick={() => router.push("/report/select-school")}
              className="btn-primary py-2 px-4 text-sm font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm inline-flex items-center gap-1.5"
            >
              <MapPin size={16} />
              Choose School
            </button>
          </div>
        )}
      </section>

      {/* Step 2: Image Upload */}
      <section className="card mb-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-700">
            2
          </span>
          Upload Evidence
        </h2>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {imagePreviews.map((preview, idx) => (
            <div key={idx} className="relative aspect-square">
              <img src={preview} alt={`Upload ${idx + 1}`} className="h-full w-full rounded-lg object-cover" />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-500"
            >
              <Camera size={24} />
              <span className="mt-1 text-xs">Add Photo</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleImageSelect(e.target.files)}
        />

        {/* AI Analysis Display */}
        {!!analyzeMutation.isPending && (
          <div className="mt-4 rounded-xl bg-brand-50/50 p-4 border border-brand-100 flex items-center gap-3 text-sm text-brand-700 animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>AI is analyzing your image and verifying category...</span>
          </div>
        )}
        {aiAnalysis && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 px-5 py-4 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-md shadow-brand-600/20">
                  <span className="text-xs font-bold font-mono">AI</span>
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">AI Quality Check</h4>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">FastAPI YOLOv11 + Ollama minicpm-v</p>
                </div>
              </div>
              
              {aiAnalysis.verification ? (
                aiAnalysis.verification.verified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Verified by AI
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                    <X className="h-3.5 w-3.5" />
                    Not Verified
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Select category to verify
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/20 p-3">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Detected Object</span>
                  <span className="mt-0.5 block font-display text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {aiAnalysis.primary_class && aiAnalysis.primary_class !== 'none' ? aiAnalysis.primary_class : 'None detected'}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/20 p-3">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Severity Score</span>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {aiAnalysis.severity_score}/10
                    </span>
                    <span className={cn(
                      "inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      aiAnalysis.severity_level === 'critical' && "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
                      aiAnalysis.severity_level === 'high' && "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                      aiAnalysis.severity_level === 'medium' && "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                      aiAnalysis.severity_level === 'low' && "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400"
                    )}>
                      {aiAnalysis.severity_level}
                    </span>
                  </div>
                </div>
              </div>

              {aiAnalysis.verification && (
                <div className="space-y-3 pt-3.5 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Category Match Confidence</span>
                      <span className={cn(
                        "font-bold font-mono",
                        aiAnalysis.verification.verified ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {(aiAnalysis.verification.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500 ease-out",
                          aiAnalysis.verification.verified 
                            ? "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-500/10" 
                            : "bg-gradient-to-r from-rose-400 to-rose-600 shadow-sm shadow-rose-500/10"
                        )}
                        style={{ width: `${Math.min(Math.max(aiAnalysis.verification.confidence * 100, 5), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50/70 dark:bg-slate-950/10 p-3.5 border border-slate-100/50 dark:border-slate-800/40">
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">AI Verdict Reason</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      {aiAnalysis.verification.reason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Step 3: Category & Description */}
      <section className="card mb-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-700">
            3
          </span>
          Issue Details
        </h2>

        <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.code}
              type="button"
              onClick={() => handleCategorySelect(cat.code)}
              className={cn(
                "flex flex-col items-center rounded-lg border p-3 text-center transition-all",
                selectedCategory === cat.code
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 hover:border-brand-300"
              )}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="mt-1 text-xs">{cat.name}</span>
            </button>
          ))}
        </div>

        <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
          Additional Details (optional)
        </label>
        <textarea
          className="input min-h-[100px]"
          placeholder="Describe the issue in detail..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </section>

      {/* Step 4: Location & Privacy */}
      <section className="card mb-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-700">
            4
          </span>
          Location & Privacy
        </h2>

        {/* Dynamic Map Component */}
        <div className="mb-6">
          <DynamicMap 
            userLocation={location} 
            schoolLocation={selectedSchool?.latitude && selectedSchool?.longitude ? { lat: selectedSchool.latitude, lng: selectedSchool.longitude } : null} 
            schoolName={selectedSchool?.name}
          />
        </div>

        {/* Location Action */}
        {!location ? (
          <button onClick={getLocation} disabled={isLoadingLocation} className="btn-secondary w-full">
            {isLoadingLocation ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MapPin size={16} />
            )}
            Share GPS Location
          </button>
        ) : (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-4">
            <p className="text-sm font-semibold text-slate-800 mb-3">Location Sharing Preference</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="loc_privacy" checked={locationPrivacy === 'exact'} onChange={() => setLocationPrivacy('exact')} className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Share exact location</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="loc_privacy" checked={locationPrivacy === 'approx'} onChange={() => setLocationPrivacy('approx')} className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Share approximate location <span className="text-slate-500 font-normal">(anonymized radius)</span></span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="loc_privacy" checked={locationPrivacy === 'hide'} onChange={() => setLocationPrivacy('hide')} className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Hide location completely <span className="text-slate-500 font-normal">(not sent)</span></span>
              </label>
            </div>
          </div>
        )}

        {/* Anonymous Identity Toggle */}
        <label className="mt-4 flex cursor-pointer items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-300 transition-colors">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <div>
            <span className="block text-sm font-bold text-slate-800">
              Report Anonymously
            </span>
            <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
              Your identity will be completely protected and not shared with any school authorities or officials.
            </span>
          </div>
        </label>
      </section>

      {/* Submit */}
      <button
        onClick={() => submitMutation.mutate()}
        disabled={submitMutation.isPending || (!selectedSchool && !selectedCategory)}
        className="btn-primary w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitMutation.isPending ? (
          "Submitting..."
        ) : (
          <>
            <Send size={18} />
            Submit Report
          </>
        )}
      </button>

      {submitMutation.isError && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Failed to submit. Please try again.
        </div>
      )}
    </div>
  );
}
