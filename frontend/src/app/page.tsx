import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/home/hero";
import { Stats } from "@/components/home/stats";
import { FeatureGrid } from "@/components/home/feature-grid";
import { HowItWorks } from "@/components/home/how-it-works";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />

      <Stats />

      <FeatureGrid />

      <HowItWorks />

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-brand-600 to-brand-800 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Report. Track. Transform.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-100">
            Join thousands of citizens improving school infrastructure across India.
            Your voice matters. Every report makes a difference.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/report">
              <Button size="lg" variant="secondary">
                📸 Report an Issue
              </Button>
            </Link>
            <Link href="/track">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-brand-700"
              >
                🔍 Track a Report
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
