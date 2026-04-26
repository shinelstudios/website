/**
 * generate-og-images.js — runs as part of `npm run build` BEFORE `vite build`.
 * Emits one 1200×630 PNG per static route into `frontend/public/og/<slug>.png`.
 *
 * Vite then copies `public/og/` into `dist/` automatically, so the URLs
 * referenced by MetaTags (e.g. `/og/work.png`) resolve at runtime.
 *
 * Idempotent: if the PNG already exists AND is newer than this script + the
 * routes file, skip it. Forces a rebuild by passing `--force`.
 *
 * Failure mode: any single route that errors logs a warning and continues —
 * we'd rather ship one missing OG than break the whole build.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { STATIC_ROUTES, ogSlugForPath } from "../src/config/staticRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FORCE = process.argv.includes("--force");

const OUT_DIR = path.resolve(__dirname, "..", "public", "og");
const FONT_400 = fs.readFileSync(path.resolve(__dirname, "_assets", "outfit-400.woff"));
const FONT_900 = fs.readFileSync(path.resolve(__dirname, "_assets", "outfit-900.woff"));

const ORANGE = "#E85002";
const BG = "#0A0A0A";
const TEXT = "#F5F5F5";
const MUTED = "#9CA3AF";

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Build the satori element for a single route.
 * Uses raw element objects (no JSX) so this script needs no transpiler.
 */
function buildCard({ kicker, title, path: pathname }) {
  const url = `shinelstudios.in${pathname === "/" ? "" : pathname}`;
  return {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: BG,
        backgroundImage: `radial-gradient(circle at 85% 0%, rgba(232,80,2,0.18), transparent 55%)`,
        fontFamily: "Outfit",
        color: TEXT,
      },
      children: [
        // Top row: brand
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: "16px" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "16px",
                    height: "16px",
                    borderRadius: "999px",
                    background: ORANGE,
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "24px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: TEXT,
                  },
                  children: "Shinel Studios",
                },
              },
            ],
          },
        },
        // Middle: kicker + title
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "20px" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "22px",
                    fontWeight: 900,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: ORANGE,
                  },
                  children: kicker || "Page",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "76px",
                    fontWeight: 900,
                    lineHeight: 1.05,
                    letterSpacing: "-0.02em",
                    color: TEXT,
                    maxWidth: "1000px",
                  },
                  children: title || "Shinel Studios",
                },
              },
            ],
          },
        },
        // Bottom: URL
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "22px",
              fontWeight: 400,
              color: MUTED,
            },
            children: [
              {
                type: "div",
                props: { children: url },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "18px",
                    fontWeight: 900,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: ORANGE,
                  },
                  children: "Built to convert",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function renderOne(route) {
  const slug = ogSlugForPath(route.path);
  const outPath = path.join(OUT_DIR, `${slug}.png`);

  if (!FORCE && fs.existsSync(outPath)) {
    const outMtime = fs.statSync(outPath).mtimeMs;
    const scriptMtime = fs.statSync(__filename).mtimeMs;
    const routesMtime = fs.statSync(path.resolve(__dirname, "..", "src", "config", "staticRoutes.js")).mtimeMs;
    if (outMtime > scriptMtime && outMtime > routesMtime) {
      return { slug, skipped: true };
    }
  }

  const svg = await satori(buildCard(route), {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Outfit", data: FONT_400, weight: 400, style: "normal" },
      { name: "Outfit", data: FONT_900, weight: 900, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(outPath, png);
  return { slug, skipped: false };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  let skipped = 0;
  let failed = 0;

  for (const route of STATIC_ROUTES) {
    try {
      const r = await renderOne(route);
      if (r.skipped) skipped++; else written++;
    } catch (e) {
      failed++;
      console.warn(`⚠️  og:${route.path} failed: ${e.message}`);
    }
  }

  console.log(
    `🖼  og images — wrote ${written}, skipped ${skipped} (cached), failed ${failed}, total routes ${STATIC_ROUTES.length}`
  );
  if (failed > 0) {
    // Don't fail the build — missing OG falls back to META.ogImage default.
    process.exitCode = 0;
  }
}

main().catch((e) => {
  console.error("og generation crashed:", e);
  // Don't fail the build — fallback is the static og-image.jpg.
  process.exitCode = 0;
});
