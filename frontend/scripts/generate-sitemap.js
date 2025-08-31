import { writeFileSync } from "fs";
import { SitemapStream, streamToPromise } from "sitemap";

async function generate() {
  const sitemap = new SitemapStream({
    hostname: "https://www.shinelstudios.in",
  });

  // Add your routes
  const pages = [
    "/", 
    "/video-editing",
    "/gfx",
    "/thumbnails",
    "/shorts",
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
