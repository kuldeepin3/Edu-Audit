/**
 * EduAudit AI - Feature Grid Section
 */
export function FeatureGrid() {
  const features = [
    {
      icon: "🤖",
      title: "AI-Powered Detection",
      description:
        "YOLOv11 computer vision automatically identifies broken toilets, roof leaks, unsafe wiring, and more from your photos.",
    },
    {
      icon: "🛡️",
      title: "Fraud Prevention",
      description:
        "Perceptual hashing and CLIP embeddings detect duplicate uploads, edited images, and spam — keeping data trustworthy.",
    },
    {
      icon: "💬",
      title: "AI Chatbot",
      description:
        "Ask questions in natural language. Get evidence-backed answers about school infrastructure across districts.",
    },
    {
      icon: "📊",
      title: "Authority Dashboard",
      description:
        "District officers get heatmaps, severity rankings, repair tracking, and AI-estimated repair costs.",
    },
    {
      icon: "📱",
      title: "Multi-Channel Access",
      description:
        "Report via web app, WhatsApp, SMS, or voice in 22 Indian languages. No smartphone required.",
    },
    {
      icon: "🔒",
      title: "Anonymous & Secure",
      description:
        "Report issues without revealing identity. JWT auth, RBAC, end-to-end encryption, and full audit trails.",
    },
    {
      icon: "🔮",
      title: "Predictive Analytics",
      description:
        "LightGBM models predict which schools will deteriorate — enabling preventive maintenance before complaints.",
    },
    {
      icon: "🌐",
      title: "Offline Support",
      description:
        "PWA with offline-first design. Capture reports without internet, auto-sync when connection returns.",
    },
  ];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Built for Scale, Designed for Impact
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Production-ready architecture combining AI, transparency, and citizen empowerment.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card group transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="text-4xl">{feature.icon}</div>
              <h3 className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
