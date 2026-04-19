import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import MetaTags from './MetaTags';
import { Kicker, Display, Lede, RevealOnScroll } from '../design';

/**
 * NotFound — 404 page.
 * Route: catch-all /*
 *
 * Editorial treatment matching the rest of the site, with both a "home"
 * and "back" CTA. Noindex so search engines don't catalog the page.
 */
const NotFound = () => {
  return (
    <div className="min-h-svh flex items-center justify-center px-4 md:px-6 py-20 relative overflow-hidden bg-[var(--surface)]">
      <MetaTags
        title="Page Not Found"
        description="The page you are looking for does not exist."
        noIndex
      />

      {/* Subtle orange glow — transform-only, GPU composited */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none rounded-full"
        style={{ background: "var(--orange)", opacity: 0.05, filter: "blur(120px)" }}
      />

      <div className="max-w-xl w-full relative z-10">
        <RevealOnScroll>
          <div className="mb-8 flex">
            <div
              className="w-16 h-16 rounded-2xl hairline grid place-items-center"
              style={{ background: "var(--orange-soft)", color: "var(--orange)" }}
            >
              <Search size={28} strokeWidth={1.5} />
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay="80ms">
          <Kicker className="mb-5">404 · Page not found</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Display as="h1" size="xl" className="mb-5">
            Lost in <span style={{ color: "var(--orange)" }}>the studio.</span>
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="240ms">
          <Lede className="mb-10">
            The page you're looking for was moved, renamed, or perhaps never existed
            in the first place. Let's get you back to somewhere useful.
          </Lede>
        </RevealOnScroll>

        <RevealOnScroll delay="320ms">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <Link to="/" className="btn-editorial">
              <Home size={16} /> Back to home
            </Link>
            <Link to="/work" className="btn-editorial-ghost">
              <ArrowLeft size={16} /> Explore the work
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  );
};

export default NotFound;
