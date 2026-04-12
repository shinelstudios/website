import React from "react";
import { motion } from "framer-motion";
import MetaTags, { BreadcrumbSchema } from "../MetaTags";
import { SectionSkeleton } from "../SkeletonLoader";
import ErrorBoundary from "../ErrorBoundary";

// Lazy load components that were on the homepage
const ProcessSection = React.lazy(() => import("../ProcessSection"));
const MediaMentions = React.lazy(() => import("../MediaMentions"));
const NewsletterSignup = React.lazy(() => import("../NewsletterSignup"));

/**
 * AboutPage
 * 
 * About: Dedicated page for Shinel Studios company information, process, and media mentions.
 */
export default function AboutPage() {
  const isDark = document.documentElement.classList.contains("dark");

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--surface)]">
        <MetaTags
          title="About Us - Shinel Studios | AI-First Creative Studio"
          description="Learn how Shinel Studios combines human craft with AI speed to deliver high-performance content for creators and brands."
          keywords="about shinel studios, creative process, AI video editing, content strategy"
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "About", url: "/about" },
          ]}
        />

        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-black mb-6 tracking-tighter"
              style={{ color: "var(--text)" }}
            >
              WE BUILD <span className="text-[var(--orange)]">ENGINES</span><br />
              FOR GROWTH.
            </motion.h1>
            <p className="text-xl max-w-3xl mx-auto text-[var(--text-muted)] font-medium">
              Shinel Studios is an AI-first creative powerhouse. We partner with top-tier creators to turn raw vision into high-retention masterpieces that dominate the feed.
            </p>
          </div>
        </section>

        {/* Process Section */}
        <ErrorBoundary fallback={<SectionSkeleton content="processStep" contentCount={4} />}>
          <React.Suspense fallback={<SectionSkeleton content="processStep" contentCount={4} />}>
            <ProcessSection />
          </React.Suspense>
        </ErrorBoundary>

        {/* Media Mentions */}
        <ErrorBoundary>
          <React.Suspense fallback={<SectionSkeleton content="card" contentCount={4} />}>
            <MediaMentions />
          </React.Suspense>
        </ErrorBoundary>

        {/* Newsletter */}
        <ErrorBoundary>
          <React.Suspense fallback={<SectionSkeleton content="card" contentCount={1} />}>
            <NewsletterSignup />
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}
