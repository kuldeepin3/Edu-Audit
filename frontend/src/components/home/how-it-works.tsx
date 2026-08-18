/**
 * EduAudit AI - How It Works Section
 */
export function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: "📸",
      title: "Capture & Report",
      description:
        "Citizens photograph infrastructure issues via the web app, WhatsApp, or SMS. Choose category, add GPS, submit in seconds.",
    },
    {
      number: "02",
      icon: "🤖",
      title: "AI Verification",
      description:
        "YOLOv11 analyzes images, detects defect type, calculates severity score, and generates a structured auto-report.",
    },
    {
      number: "03",
      icon: "🛡️",
      title: "Fraud Check",
      description:
        "Perceptual hashing and CLIP embeddings filter duplicates, edited images, and spam before reports reach authorities.",
    },
    {
      number: "04",
      icon: "🏛️",
      title: "Authority Action",
      description:
        "District officers see prioritized complaints on dashboards with heatmaps, cost estimates, and SLA tracking.",
    },
    {
      number: "05",
      icon: "🔧",
      title: "Repair & Track",
      description:
        "Contractors are assigned, work begins, and citizens receive real-time status updates until resolution.",
    },
    {
      number: "06",
      icon: "✅",
      title: "Verified Completion",
      description:
        "Post-repair photos confirm the fix. School health scores update. The cycle of accountability continues.",
    },
  ];

  return (
    <section className="bg-slate-50 py-20 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            From photo to repaired school — a transparent, AI-powered journey.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={step.number} className="relative">
              <div className="card h-full">
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{step.icon}</span>
                  <span className="font-display text-5xl font-bold text-slate-100 dark:text-slate-800">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
              {/* Connector arrow (except last) */}
              {idx < steps.length - 1 && idx % 3 !== 2 && (
                <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-slate-300 lg:block">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
