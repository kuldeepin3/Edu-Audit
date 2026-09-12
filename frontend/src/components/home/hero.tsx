"use client";

import React from "react";
import Link from "next/link";
import { Camera, Search, ShieldCheck, MapPin, CheckCircle2, ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 tracking-wide uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
            National School Infrastructure Audit & Grievance Cell
          </div>

          {/* Clean Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 font-sans leading-tight">
            Citizen-Led Verification for Public School Infrastructure
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Directly report structural hazards, unsanitary washrooms, and unsafe electrical wiring in government schools. Track remediation from field submission to statutory work completion.
          </p>

          {/* Minimalist Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/report"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Camera size={16} />
              <span>Report an Issue</span>
            </Link>
            <Link
              href="/track"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold transition-colors"
            >
              <Search size={16} />
              <span>Track Report Status</span>
            </Link>
          </div>

          {/* Institutional Quality Badges */}
          <div className="pt-8 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>RTE Section 19</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Statutory safety compliance</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-blue-600" />
                <span>UDISE Directory</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">All 10.5L+ public schools</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin size={13} className="text-amber-600" />
                <span>Geo-Tagged</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Tamper-proof evidence</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ArrowRight size={13} className="text-slate-700" />
                <span>Direct to DEO</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Official work order release</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
