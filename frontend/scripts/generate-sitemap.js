import { writeFileSync } from "fs";
import { SitemapStream, streamToPromise } from "sitemap";

async function generate() {
  const sitemap = new SitemapStream({
    hostname: "https://www.shinelstudios.in",
  });

  // Add your routes
  const pages = [
    // Core Pages
    "/",
    "/work",
    "/pricing",
    "/live",
    "/contact",

    // Service Category Pages
    "/services/gfx",
    "/services/editing",
    "/services/growth",

    // Service Item Pages (Canonical)
    "/thumbnails",
    "/branding",
    "/shorts",
    "/video-editing",
    "/services/growth/seo",
    "/services/growth/captions",

    // Service Subcategory Pages (GFX)
    "/services/gfx/thumbnails/youtube",
    "/services/gfx/thumbnails/gaming",
    "/services/gfx/thumbnails/podcast",
    "/services/gfx/branding/channel",
    "/services/gfx/branding/social",
    "/services/gfx/branding/banners",

    // Service Subcategory Pages (Editing)
    "/services/editing/shorts/gaming",
    "/services/editing/shorts/vlog",
    "/services/editing/shorts/podcast",
    "/services/editing/long/gaming",
    "/services/editing/long/vlog",
    "/services/editing/long/podcast",

    // Service Subcategory Pages (Growth)
    "/services/growth/seo/titles",
    "/services/growth/seo/descriptions",
    "/services/growth/seo/keywords",
    "/services/growth/captions/srt",
    "/services/growth/captions/styles",

    // Tools & Resources
    "/tools/thumbnail-previewer",
    "/roi-calculator",
    "/tools/srt",
    "/tools/seo",

    // Anchors
    "/#services",
    "/#testimonials",
    "/#contact"
  ];

  // Write each page into sitemap
  pages.forEach((url) => {
    sitemap.write({
      url,
      changefreq: "weekly",
      priority: url === "/" ? 1.0 : 0.8,
      lastmod: new Date().toISOString(),
    });
  });

  sitemap.end();

  const xml = await streamToPromise(sitemap).then((sm) => sm.toString());
  writeFileSync("./public/sitemap.xml", xml);

  console.log("✅ sitemap.xml generated!");
}

generate();
