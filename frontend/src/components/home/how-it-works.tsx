"use client";

import React from "react";
import { Camera, Cpu, ClipboardCheck, CheckCircle2 } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      step: "Step 01",
      icon: Camera,
      title: "Field Evidence Submission",
      description:
        "Citizen or school staff uploads clear photographic evidence with GPS location and the 11-digit UDISE school code.",
    },
    {
      step: "Step 02",
      icon: Cpu,
      title: "Automated Defect Analysis",
      description:
        "Computer vision classifies the defect across the 5 canonical domains, flags urgency level, and checks against duplicate logs.",
    },
    {
      step: "Step 03",
      icon: ClipboardCheck,
      title: "District Officer Verification",
      description:
        "Assigned District Education Officer (DEO) audits the report, verifies contractor repair estimates, and authorizes work orders.",
    },
    {
      step: "Step 04",
      icon: CheckCircle2,
      title: "Certified Completion & Archive",
      description:
        "Post-repair inspection generates a statutory completion certificate, updates the school quality score, and closes the ticket.",
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            End-to-End Remediation Lifecycle
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-sans tracking-tight">
            How EduAudit Operates
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
            A transparent four-stage pipeline connecting citizen reports directly to verified public works execution.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-slate-50/60 p-5 rounded-lg border border-slate-200 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {item.step}
                    </span>
                    <div className="p-1.5 bg-white border border-slate-200 text-slate-700 rounded">
                      <Icon size={15} />
                    </div>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
