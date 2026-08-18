import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format relative time (e.g. "3 hours ago")
 */
export function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

/**
 * Get severity color
 */
export function severityColor(level: string): string {
  const colors: Record<string, string> = {
    critical: "bg-red-500 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-emerald-500 text-white",
  };
  return colors[level] || colors.medium;
}

/**
 * Get status color & label
 */
export function statusConfig(status: string): { label: string; color: string } {
  const configs: Record<string, { label: string; color: string }> = {
    submitted: { label: "Submitted", color: "bg-slate-200 text-slate-800" },
    ai_verified: { label: "AI Verified", color: "bg-blue-200 text-blue-800" },
    pending_review: { label: "Pending Review", color: "bg-amber-200 text-amber-800" },
    verified: { label: "Verified", color: "bg-emerald-200 text-emerald-800" },
    rejected: { label: "Rejected", color: "bg-red-200 text-red-800" },
    assigned: { label: "Assigned", color: "bg-indigo-200 text-indigo-800" },
    in_progress: { label: "In Progress", color: "bg-purple-200 text-purple-800" },
    pending_completion: { label: "Awaiting Verification", color: "bg-cyan-200 text-cyan-800" },
    completed: { label: "Completed", color: "bg-green-200 text-green-800" },
    reopened: { label: "Reopened", color: "bg-orange-200 text-orange-800" },
  };
  return configs[status] || { label: status, color: "bg-slate-200 text-slate-800" };
}

/**
 * Format currency (INR)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get health grade color
 */
export function healthGradeColor(grade?: string): string {
  const colors: Record<string, string> = {
    "A+": "text-emerald-600",
    A: "text-emerald-500",
    B: "text-blue-500",
    C: "text-amber-500",
    D: "text-orange-500",
    F: "text-red-500",
  };
  return colors[grade || ""] || "text-slate-500";
}
