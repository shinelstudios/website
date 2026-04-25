/**
 * images-to-webp.js — convert every JPG/PNG asset under
 * frontend/src/assets/ + frontend/public/assets/ into a sibling .webp.
 *
 * Run by `npm run build` ahead of vite. Idempotent: skips files where
 * the .webp already exists AND its mtime is newer than the source.
 *
 * Why not Cloudflare Polish? Polish is $5/mo and runs at the edge.
 * This script does the same thing at build time, ships smaller assets,
 * and stays free. Tradeoff: we serve both the original and the .webp,
 * letting the browser pick via <picture>/<source> — but at our scale
 * the bundle savings still win.
 *
 * The Img design primitive at frontend/src/design/ui/Img.jsx already
 * supports a `webp` prop that adds a <source srcset="…webp">. After
 * this script runs, callers can pass `webp={true}` to opt in.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, "..");

// Directories to walk. Add more here if asset folders proliferate.
const ROOTS = [
  path.join(FRONTEND_ROOT, "src", "assets"),
  path.join(FRONTEND_ROOT, "public", "assets"),
];

const SOURCE_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const WEBP_QUALITY = 82; // visually lossless for thumbnails; ~70% smaller than JPG.

let stats = { converted: 0, skipped: 0, errors: 0, bytesIn: 0, bytesOut: 0 };

async function walk(dir) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") return; // skip missing dirs
    throw e;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!SOURCE_EXTS.has(ext)) continue;
    await convertOne(full);
  }
}

async function convertOne(srcPath) {
  const webpPath = srcPath.replace(/\.(jpe?g|png)$/i, ".webp");
  try {
    const [srcStat, webpStat] = await Promise.all([
      fs.promises.stat(srcPath),
      fs.promises.stat(webpPath).catch(() => null),
    ]);

    // Skip if .webp exists and is at least as new as source.
    if (webpStat && webpStat.mtimeMs >= srcStat.mtimeMs) {
      stats.skipped++;
      return;
    }

    const buf = await sharp(srcPath)
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
    await fs.promises.writeFile(webpPath, buf);

    stats.converted++;
    stats.bytesIn += srcStat.size;
    stats.bytesOut += buf.length;
    const pct = Math.round((1 - buf.length / srcStat.size) * 100);
    console.log(
      `  ✓ ${path.relative(FRONTEND_ROOT, srcPath)} → .webp (-${pct}%)`
    );
  } catch (e) {
    stats.errors++;
    console.error(`  ✗ ${path.relative(FRONTEND_ROOT, srcPath)}: ${e.message}`);
  }
}

async function main() {
  console.log("🌨️  images-to-webp: scanning asset roots…");
  for (const root of ROOTS) {
    await walk(root);
  }
  const savedKB = ((stats.bytesIn - stats.bytesOut) / 1024).toFixed(1);
  console.log(
    `🏁  ${stats.converted} converted, ${stats.skipped} cached, ${stats.errors} errors. Saved ${savedKB} KB.`
  );
  if (stats.errors > 0) process.exitCode = 1;
}

main();
