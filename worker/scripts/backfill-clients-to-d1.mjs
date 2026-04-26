// One-shot migration: read SHINEL_AUDIT KV `app:clients:registry`, INSERT OR
// IGNORE each client row into D1. Idempotent — re-runnable safely.
//
// Run: node scripts/backfill-clients-to-d1.mjs > backfill.sql
// Then: npx wrangler d1 execute shinel-db --remote --file=backfill.sql
//
// We can't read KV from a Node script directly (no Cloudflare bindings here),
// so this script reads /tmp/kv-clients.json which you produce via:
//   npx wrangler kv key get --remote --namespace-id=<id> "app:clients:registry" > /tmp/kv-clients.json
import fs from "node:fs";

const raw = fs.readFileSync("kv-clients.json", "utf8");
const clients = JSON.parse(raw);

const esc = (v) => v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

const lines = [];
for (const c of clients) {
  if (!c?.id || !c?.name) continue;
  lines.push(
    `INSERT OR IGNORE INTO clients (id, name, youtube_id, handle, instagram_handle, uploads_playlist_id, category, status, subscribers, instagram_followers, instagram_logo) VALUES (` +
    [
      esc(c.id),
      esc(c.name),
      esc(c.youtubeId),
      esc(c.handle || ""),
      esc(c.instagramHandle || ""),
      esc(c.uploadsPlaylistId || ""),
      esc(c.category || ""),
      esc(c.status || "active"),
      num(c.subscribers),
      num(c.instagramFollowers),
      esc(c.instagramLogo || ""),
    ].join(", ") +
    ");"
  );
}

console.error(`-- Generated ${lines.length} INSERT statements from ${clients.length} KV clients`);
console.log(lines.join("\n"));
