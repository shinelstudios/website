import React from "react";
import { motion } from "framer-motion";
import MetaTags, { BreadcrumbSchema } from "../MetaTags";
import { SectionSkeleton } from "../SkeletonLoader";
import ErrorBoundary from "../ErrorBoundary";
import { HelpCircle } from "lucide-react";

// Lazy load the FAQ Section from homepage
const FAQSection = React.lazy(() => import("../FAQSection"));
const ContactCTA = React.lazy(() => import("../ContactCTA"));

/**
 * FAQPage
 * 
 * About: Dedicated page for frequently asked questions about Shinel Studios' services.
 */
export default function FAQPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--surface)]">
        <MetaTags
          title="FAQ - Shinel Studios | AI-First Creative Studio"
          description="Find answers to common questions about our video editing, thumbnail design, and growth services."
          keywords="shinel studios faq, video editing cost, thumbnail design process, creator growth"
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "FAQ", url: "/faq" },
          ]}
        />

        <section className="pt-32 pb-12 relative overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6"
              style={{
                color: "var(--orange)",
                border: "1px solid var(--border)",
                background: "rgba(232,80,2,0.08)",
              }}
            >
              <HelpCircle size={14} />
              Help Center
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-black mb-6 tracking-tighter uppercase"
              style={{ color: "var(--text)" }}
            >
              Frequently Asked <span className="text-[var(--orange)]">Questions</span>
            </motion.h1>
            <p className="text-xl max-w-2xl mx-auto text-[var(--text-muted)] font-medium">
              Everything you need to know about partnering with Shinel Studios.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <div className="pb-20">
          <ErrorBoundary fallback={<SectionSkeleton content="accordion" contentCount={6} />}>
            <React.Suspense fallback={<SectionSkeleton content="accordion" contentCount={6} />}>
              <FAQSection />
            </React.Suspense>
          </ErrorBoundary>
        </div>

        {/* Support CTA */}
        <section className="py-20 bg-[var(--surface-alt)] border-y border-[var(--border)] text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--text)" }}>Still have questions?</h2>
            <p className="text-[var(--text-muted)] mb-8 max-w-xl mx-auto">We're here to help you shine. Reach out to our team via WhatsApp or email for a personalized response.</p>
            <React.Suspense fallback={<SectionSkeleton content="card" contentCount={1} />}>
              <ContactCTA />
            </React.Suspense>
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}
