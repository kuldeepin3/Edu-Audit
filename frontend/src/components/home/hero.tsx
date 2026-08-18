/**
 * EduAudit AI - Landing Page Hero
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <span className="flex h-2 w-2 rounded-full bg-brand-500" />
            AI-Powered GovTech Platform
          </div>

          {/* Heading */}
          <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            Every Citizen a{" "}
            <span className="bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
              School Auditor
            </span>
          </h1>

          {/* Subheading */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            EduAudit AI uses computer vision, fraud detection, and AI chatbots
            to monitor government school infrastructure. Report issues in seconds.
            Track repairs to completion. Bring transparency to education.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/report"
              className="btn-primary inline-flex h-12 items-center px-8 text-base"
            >
              📸 Report an Issue
            </a>
            <a
              href="/dashboard"
              className="btn-outline inline-flex h-12 items-center px-8 text-base"
            >
              📊 View Dashboard
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <span>AI-Powered Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📱</span>
              <span>WhatsApp & SMS Support</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <span>Anonymous Reporting</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌐</span>
              <span>22 Indian Languages</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
