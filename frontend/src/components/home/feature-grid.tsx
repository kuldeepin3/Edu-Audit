"use client";

import React from "react";
import { Droplets, Zap, Building2, Boxes, AppWindow } from "lucide-react";

export function FeatureGrid() {
  const categories = [
    {
      code: "01",
      icon: Droplets,
      title: "Washroom & Sanitation",
      compliance: "RTE Norms Schedule II",
      description:
        "Monitoring functional running water, student toilet blocks, drainage blockages, and sanitation maintenance.",
    },
    {
      code: "02",
      icon: Zap,
      title: "Unsafe Wiring & Electrical",
      compliance: "NBC Part 8 Electrical Safety",
      description:
        "Inspection of exposed high-voltage wiring, dangling cables, damaged main switchboards, and classroom shock hazards.",
    },
    {
      code: "03",
      icon: Building2,
      title: "Walls, Masonry & Plaster",
      compliance: "IS 1893 Structural Norms",
      description:
        "Detection of structural shear cracks, deep masonry fractures, ceiling water seepage, and staircase stability.",
    },
    {
      code: "04",
      icon: Boxes,
      title: "Classroom Furniture",
      compliance: "Samagra Shiksha Norms",
      description:
        "Verification of student dual-desk benches, study chairs, broken tabletops, and replacement of sharp splintered wood.",
    },
    {
      code: "05",
      icon: AppWindow,
      title: "Windows, Doors & Enclosures",
      compliance: "NBC Building Protection",
      description:
        "Verification of shattered glass panes, missing ventilation window grills, broken door latches, and security enclosures.",
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Statutory Scope of Inspection
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-sans tracking-tight">
            5 Core Infrastructure Domains
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
            Every submitted grievance and field audit report is categorized across these 5 canonical physical safety standards.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.title}
                className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-between space-y-3 shadow-none"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-slate-100 text-slate-800 rounded-md">
                      <Icon size={16} />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-400">
                      CLASS {cat.code}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {cat.title}
                  </h3>
                  <div className="text-[10px] font-medium text-slate-500">
                    {cat.compliance}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {cat.description}
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
