import { writeFileSync } from "fs";
import { SitemapStream, streamToPromise } from "sitemap";

const AUTH_BASE =
  process.env.VITE_AUTH_BASE ||
  "https://shinel-auth.shinelstudioofficial.workers.dev";

/**
 * Fetch team member slugs from the live /team endpoint at build time.
 * Each member gets their own /team/:slug entry in the sitemap so Google
 * can index "{maker name} shinel studios" searches — editors and artists
 * benefit from the SEO even though /team isn't linked from site nav
 * (business-protection policy).
 *
 * If the fetch fails (worker cold-start, network issue), we log and
 * continue without the team slugs. The build does NOT fail.
 */
async function fetchTeamSlugs() {
  try {
    const res = await fetch(`${AUTH_BASE}/team`, {
      // Accept non-2xx gracefully; we'd rather ship an incomplete sitemap
      // than fail the whole build.
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`⚠️  /team endpoint returned ${res.status}; skipping team slugs`);
      return [];
    }
    const data = await res.json();
    const team = Array.isArray(data?.team) ? data.team : [];
    // Prefer slug; fall back to email-local-part (same resolution the
    // /profiles/:slug endpoint uses server-side).
    return team
      .map((m) => m?.slug || (m?.email || "").split("@")[0])
      .filter(Boolean);
  } catch (e) {
    console.warn(`⚠️  could not fetch /team for sitemap: ${e.message}`);
    return [];
  }
}

/**
 * Fetch publicly-enabled client-portal slugs from /clients. Each one becomes
 * a /c/<slug> entry. We only ship slugs where the client has flipped
 * publicEnabled=true (so unpublished portals don't get indexed). Same
 * fail-soft contract as fetchTeamSlugs.
 */
async function fetchClientPortalSlugs() {
  try {
    const res = await fetch(`${AUTH_BASE}/clients`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`⚠️  /clients endpoint returned ${res.status}; skipping client portal slugs`);
      return [];
    }
    const data = await res.json();
    const clients = Array.isArray(data?.clients) ? data.clients : [];
    return clients
      .filter((c) => c?.slug && c?.publicEnabled)
      .map((c) => c.slug);
  } catch (e) {
    console.warn(`⚠️  could not fetch /clients for sitemap: ${e.message}`);
    return [];
  }
}

async function generate() {
  const sitemap = new SitemapStream({
    hostname: "https://shinelstudios.in",
  });

  const [teamSlugs, clientPortalSlugs] = await Promise.all([
    fetchTeamSlugs(),
    fetchClientPortalSlugs(),
  ]);

  const pages = [
    // Core marketing pages (editorial v2)
    "/",
    "/about",
    "/work",
    "/work/ai-music",
    "/work/ai-tattoo",
    "/work/ai-gfx",
    "/pricing",
    "/faq",
    "/live",
    "/contact",
    "/privacy",
    "/terms",

    // Service pages (canonical editorial v2)
    "/video-editing",
    "/shorts",
    "/thumbnails",
    "/branding",
    "/graphic-design",

    // Team directory — intentionally kept out of nav, but indexed so
    // individual makers surface in Google "name + shinel studios" searches.
    "/team",
    ...teamSlugs.map((slug) => `/team/${slug}`),

    // Tools hub + free tools
    "/tools",
    "/tools/srt",
    "/tools/seo",
    "/tools/comparison",
    "/tools/thumbnail-previewer",
    "/tools/thumbnail-tester",
    "/tools/thumbnail-ideation",
    "/tools/thumbnail-clickability",
    "/tools/channel-audit",
    "/tools/content-calendar",
    "/tools/custom-ais",
    "/roi-calculator",

    // Blog
    "/blog",

    // Pricing calculator (deep-link)
    "/pricing/calculator",

    // Live pulse templates
    "/live-templates",

    // Client portal — public per-creator pages (only the publicly-enabled ones).
    // Creators share these as their bio link, so they get indexed for
    // "<creator name>" Google searches the same way /team profiles do.
    ...clientPortalSlugs.map((slug) => `/c/${slug}`),
  ];

  // De-dupe just in case
  const seen = new Set();
  for (const url of pages) {
    if (seen.has(url)) continue;
    seen.add(url);
    sitemap.write({
      url,
      changefreq: url === "/" ? "daily" : "weekly",
      priority:
        url === "/" ? 1.0 :
        url.startsWith("/team/") ? 0.7 :
        url.startsWith("/c/") ? 0.6 :
        0.8,
      lastmod: new Date().toISOString(),
    });
  }

  sitemap.end();

  const xml = await streamToPromise(sitemap).then((sm) => sm.toString());
  writeFileSync("./public/sitemap.xml", xml);

  console.log(
    `✅ sitemap.xml generated — ${seen.size} URLs (${teamSlugs.length} team profiles, ${clientPortalSlugs.length} client portal pages)`
  );
}

generate().catch((e) => {
  console.error("sitemap generation failed:", e);
  process.exitCode = 1;
});
