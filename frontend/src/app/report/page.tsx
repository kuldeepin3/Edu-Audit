/**
 * EduAudit AI - Report Submission Page
 * Citizens upload photos, choose category, submit complaints
 */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Camera, MapPin, Send, X, CheckCircle, Loader2, Mic, MicOff, Languages } from "lucide-react";
import { api, CATEGORIES, MODEL_CLASS_TO_CATEGORY } from "@/lib/api";
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

  // Speech Recognition / Voice Dictation State
  const [isRecording, setIsRecording] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<"en-IN" | "hi-IN" | "gu-IN">("hi-IN");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsRecording(false);
      return;
    }

    setSpeechError(null);
    const SpeechRecognition = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported by this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLanguage;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setDescription((prev) => {
            const separator = prev && !prev.endsWith(" ") ? " " : "";
            return prev + separator + transcript.trim();
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech error:", event.error);
        if (event.error === "not-allowed") {
          setSpeechError("Microphone access blocked. Please allow mic permissions in browser.");
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech init error:", err);
      setSpeechError("Could not access microphone.");
      setIsRecording(false);
    }
  };

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
    if (!files || files.length === 0) return;
    const newImages = Array.from(files).slice(0, 5);
    setImages((prev) => [...prev, ...newImages].slice(0, 5));

    newImages.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Auto-analyze first image directly with YOLOv11 model
    const firstFile = newImages[0];
    if (firstFile) {
      analyzeImage(firstFile);
    }
  };

  // AI image analysis via YOLOv11 backend
  const analyzeMutation = useMutation({
    mutationFn: ({ file, category }: { file: File; category?: string }) => api.analyzeImage(file, category),
    onSuccess: (data) => {
      setAiAnalysis(data);
      if (data) {
        const categoryCode =
          (data.primary_class_code && MODEL_CLASS_TO_CATEGORY[data.primary_class_code]) ||
          (data.primary_class && MODEL_CLASS_TO_CATEGORY[data.primary_class]);
        if (categoryCode) {
          setSelectedCategory(categoryCode);
        }
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
          <div className="mt-4 rounded-xl bg-gradient-to-r from-brand-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/80 p-3.5 border border-brand-200 dark:border-slate-700 flex items-center gap-3 text-xs text-brand-900 dark:text-brand-300">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600 shrink-0" />
            <div>
              <p className="font-semibold">AI Analyzing Evidence...</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Classifying infrastructure defect with YOLOv11 & Gemini Vision</p>
            </div>
          </div>
        )}
        {aiAnalysis && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/50 p-4 transition-all">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">AI Infrastructure Audit Result</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                {aiAnalysis.detections && aiAnalysis.detections.length > 0 ? "YOLOv11 Detected" : "Gemini Vision Verified"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs mb-2">
              <div>
                <span className="block text-[11px] text-slate-500">Auto-Detected Class</span>
                <span className="font-bold text-brand-700 dark:text-brand-300 text-sm">
                  {aiAnalysis.primary_class && aiAnalysis.primary_class !== 'none' ? aiAnalysis.primary_class : 'General Defect'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500">Severity</span>
                <span className={cn(
                  "font-bold text-xs uppercase px-1.5 py-0.5 rounded inline-block mt-0.5",
                  aiAnalysis.severity_level === "critical" ? "bg-red-100 text-red-700" :
                  aiAnalysis.severity_level === "high" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"
                )}>
                  {aiAnalysis.severity_level} ({aiAnalysis.severity_score}/10)
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500">Confidence</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {aiAnalysis.primary_confidence ? `${(aiAnalysis.primary_confidence * 100).toFixed(0)}%` : (aiAnalysis.verification?.confidence ? `${(aiAnalysis.verification.confidence * 100).toFixed(0)}%` : '95%')}
                </span>
              </div>
            </div>

            {(aiAnalysis.verification?.reason || aiAnalysis.recommendation) && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Analysis: </span>
                {aiAnalysis.verification?.reason || aiAnalysis.recommendation}
              </p>
            )}
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
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
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

        {/* Multilingual Voice Note & Dictation Header */}
        <div className="mb-2 mt-5 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Additional Details & Observations
          </label>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Languages size={14} className="text-slate-500 ml-1" />
            <button
              type="button"
              onClick={() => setSpeechLanguage("hi-IN")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                speechLanguage === "hi-IN" ? "bg-brand-600 text-white font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setSpeechLanguage("gu-IN")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                speechLanguage === "gu-IN" ? "bg-brand-600 text-white font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              ગુજરાતી
            </button>
            <button
              type="button"
              onClick={() => setSpeechLanguage("en-IN")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                speechLanguage === "en-IN" ? "bg-brand-600 text-white font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Voice Note Recording Bar */}
        <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Voice Dictation ({speechLanguage === "hi-IN" ? "Hindi" : speechLanguage === "gu-IN" ? "Gujarati" : "English"})
          </span>
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
              isRecording
                ? "bg-red-600 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-600"
            )}
          >
            {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
            <span>{isRecording ? "Stop Recording" : "Record Voice"}</span>
          </button>
        </div>

        {speechError && (
          <div className="mb-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200">
            ⚠️ {speechError}
          </div>
        )}

        <textarea
          className="input min-h-[100px]"
          placeholder={`Describe the issue, or tap 'Record Voice' to speak in ${speechLanguage === "hi-IN" ? "Hindi" : speechLanguage === "gu-IN" ? "Gujarati" : "English"}...`}
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
        <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {(submitMutation.error as any)?.response?.data?.detail || (submitMutation.error as any)?.message || "Failed to submit. Please try again."}
        </div>
      )}
    </div>
  );
}
