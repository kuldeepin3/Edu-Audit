"use client";

import dynamic from "next/dynamic";

// Dynamically import the MapComponent with SSR disabled
const DynamicMap = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-xl bg-slate-100 border-2 border-dashed border-slate-200">
      <div className="text-sm font-medium text-slate-500 animate-pulse">Loading map...</div>
    </div>
  ),
});

export default DynamicMap;
