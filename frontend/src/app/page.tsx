import Link from "next/link";
import { Hero } from "@/components/home/hero";
import { FeatureGrid } from "@/components/home/feature-grid";
import { HowItWorks } from "@/components/home/how-it-works";

export default function HomePage() {
  return (
    <div className="flex flex-col bg-white font-sans text-slate-900">
      <Hero />

      <FeatureGrid />

      <HowItWorks />

      {/* Minimalist Institutional Action Block */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="p-8 md:p-12 rounded-xl bg-slate-900 text-white border border-slate-800 text-center space-y-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              National Grievance Redressal Mechanism
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Report Campus Safety Defects or Track Pending Remediations
            </h2>
            <p className="mx-auto max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every complaint is cryptographically registered, verified against official UDISE school registries, and assigned to district educational authorities for statutory compliance.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/report"
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                Report an Issue
              </Link>
              <Link
                href="/track"
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Track Report Status
              </Link>
              <Link
                href="/portal/login"
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Auditor Portal Access →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
