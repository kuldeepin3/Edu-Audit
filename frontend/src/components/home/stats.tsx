/**
 * EduAudit AI - Homepage Stats Section
 */
export function Stats() {
  const stats = [
    { label: "Govt Schools in India", value: "10.5L+", icon: "🏫" },
    { label: "Lack Functional Toilets", value: "43.6%", icon: "🚽" },
    { label: "Avg. Resolution Time", value: "180 days", icon: "⏱️" },
    { label: "EduAudit Target", value: "< 15 days", icon: "🎯" },
  ];

  return (
    <section className="border-y border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl">{stat.icon}</div>
              <div className="mt-2 font-display text-2xl font-bold text-brand-600 sm:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
