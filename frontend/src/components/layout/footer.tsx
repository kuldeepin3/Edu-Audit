"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/portal") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              EduAudit AI
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              AI-Powered School Infrastructure Monitoring & Transparency System.
              Built for India&apos;s government schools.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Platform</h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <li>Report an Issue</li>
              <li>Track Reports</li>
              <li>Authority Dashboard</li>
              <li>AI Chatbot</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Resources</h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <li>API Documentation</li>
              <li>Open Source</li>
              <li>Privacy Policy</li>
              <li>Contact DEO</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-8 text-center text-sm text-slate-500 dark:border-slate-800">
          <p>
            © 2026 EduAudit AI.
          </p>
        </div>
      </div>
    </footer>
  );
}
