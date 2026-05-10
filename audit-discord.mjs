#!/usr/bin/env node
/**
 * audit-discord.mjs — read-only inventory of your Discord server.
 *
 * Lists every category, channel, role, and bot. Flags obvious duplicates and
 * candidates for cleanup. NEVER writes — completely safe to run.
 *
 * Output:
 *   - .discord-audit.json  (full snapshot)
 *   - .discord-audit.txt   (human-readable report)
 *   - prints the report to stdout
 *
 * Usage:  node audit-discord.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const GUILD_ID = process.argv[2] || "1298972908193972255";
const TOKEN = readFileSync(".discord-bot-token", "utf8").trim().replace(/^["']|["']$/g, "");
const API = "https://discord.com/api/v10";
const HEADERS = {
  Authorization: `Bot ${TOKEN}`,
  "Content-Type": "application/json",
  "User-Agent": "ShinelCockpitBot/1.0",
};

const TYPE = { TEXT: 0, DM: 1, VOICE: 2, CATEGORY: 4, ANNOUNCEMENT: 5, STAGE: 13, FORUM: 15 };
const TYPE_NAME = { 0: "text", 2: "voice", 4: "category", 5: "news", 13: "stage", 15: "forum" };

async function api(method, path) {
  const res = await fetch(`${API}${path}`, { method, headers: HEADERS });
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    await new Promise((r) => setTimeout(r, (j.retry_after || 1) * 1000 + 200));
    return api(method, path);
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function paginatedMembers(guildId) {
  // Discord caps GET /members at 1000 per call. Paginate by `after` until empty.
  const all = [];
  let after = "0";
  while (true) {
    const batch = await api("GET", `/guilds/${guildId}/members?limit=1000&after=${after}`);
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }
  return all;
}

// Channels we just created via setup-discord.mjs — never flag as cleanup candidates
const OUR_CATEGORIES = new Set(["🏢 SHINEL HQ", "🤖 COCKPIT OPS", "📁 CLIENT CORNER"]);
const OUR_CHANNELS = new Set([
  "announcements", "wins",
  "ops-pipeline", "finance", "alerts", "audit-log",
  "aish-is-live", "ap-sports-arena", "gamify-with-anchit", "kamz-inkzone",
  "kiaraa-gaming", "kundan-parashar", "shinel-studios-int",
  "deadlox-gaming", "vib-n-ric",
]);

async function main() {
  console.log(`🔍 Auditing guild ${GUILD_ID}…\n`);

  const [guild, channels, roles, members] = await Promise.all([
    api("GET", `/guilds/${GUILD_ID}`),
    api("GET", `/guilds/${GUILD_ID}/channels`),
    api("GET", `/guilds/${GUILD_ID}/roles`),
    paginatedMembers(GUILD_ID).catch((e) => {
      console.warn(`⚠ couldn't list members (${e.message}) — bot may need GUILD_MEMBERS intent enabled in dev portal`);
      return [];
    }),
  ]);

  // Build category → children map
  const cats = channels.filter((c) => c.type === TYPE.CATEGORY).sort((a, b) => a.position - b.position);
  const orphans = channels.filter((c) => c.type !== TYPE.CATEGORY && !c.parent_id);
  const byParent = {};
  for (const c of channels) {
    if (c.type === TYPE.CATEGORY) continue;
    if (!c.parent_id) continue;
    (byParent[c.parent_id] ||= []).push(c);
  }
  for (const arr of Object.values(byParent)) arr.sort((a, b) => a.position - b.position);

  // Find duplicate channel names
  const nameCounts = {};
  for (const c of channels) {
    if (c.type === TYPE.CATEGORY) continue;
    const n = c.name.toLowerCase();
    (nameCounts[n] ||= []).push(c);
  }
  const dupes = Object.entries(nameCounts).filter(([, arr]) => arr.length > 1);

  // Bots
  const bots = members.filter((m) => m.user?.bot);

  // Build report
  const lines = [];
  const push = (s = "") => lines.push(s);

  push("═".repeat(72));
  push(`  DISCORD AUDIT — ${guild.name}`);
  push(`  ${channels.length} channels · ${roles.length} roles · ${members.length} members · ${bots.length} bots`);
  push(`  generated ${new Date().toISOString()}`);
  push("═".repeat(72));
  push();

  push("─── CATEGORIES ───────────────────────────────────────────────────────");
  for (const cat of cats) {
    const children = byParent[cat.id] || [];
    const tag = OUR_CATEGORIES.has(cat.name) ? "  [NEW · keep]" : "";
    push(`\n📁 ${cat.name}${tag}`);
    push(`   id=${cat.id} · ${children.length} children`);
    if (children.length === 0) {
      push(`   ⚠ EMPTY CATEGORY — candidate for deletion`);
    }
    for (const ch of children) {
      const newTag = OUR_CHANNELS.has(ch.name) && OUR_CATEGORIES.has(cat.name) ? " [NEW]" : "";
      const dupTag = (nameCounts[ch.name.toLowerCase()] || []).length > 1 ? " ⚠ DUPLICATE NAME" : "";
      const t = TYPE_NAME[ch.type] || `t${ch.type}`;
      push(`   ${t.padEnd(8)} #${ch.name}${newTag}${dupTag}  (id=${ch.id})`);
    }
  }
  push();

  if (orphans.length) {
    push("─── ORPHAN CHANNELS (not in any category) ────────────────────────────");
    for (const ch of orphans) {
      const t = TYPE_NAME[ch.type] || `t${ch.type}`;
      push(`   ${t.padEnd(8)} #${ch.name}  (id=${ch.id})`);
    }
    push();
  }

  if (dupes.length) {
    push("─── DUPLICATE CHANNEL NAMES ──────────────────────────────────────────");
    for (const [name, arr] of dupes) {
      push(`\n   #${name} (${arr.length} copies):`);
      for (const c of arr) {
        const parent = cats.find((p) => p.id === c.parent_id);
        const inOurCat = parent && OUR_CATEGORIES.has(parent.name);
        const tag = inOurCat ? " [NEW · keep]" : "";
        push(`     - id=${c.id} in "${parent ? parent.name : "(no parent)"}"${tag}`);
      }
    }
    push();
  }

  push("─── ROLES ────────────────────────────────────────────────────────────");
  // Sort by position desc (highest = most powerful)
  const sortedRoles = [...roles].sort((a, b) => b.position - a.position);
  for (const r of sortedRoles) {
    const flags = [];
    if (r.managed) flags.push("BOT-MANAGED");
    if (r.tags?.bot_id) flags.push(`bot=${r.tags.bot_id}`);
    if (r.tags?.integration_id) flags.push("INTEGRATION");
    if (r.tags?.premium_subscriber !== undefined) flags.push("BOOSTER");
    if (r.name === "@everyone") flags.push("EVERYONE");
    if (r.name.toLowerCase() === "team") flags.push("NEW · keep");
    const flagStr = flags.length ? `  [${flags.join(", ")}]` : "";
    const memberCount = members.filter((m) => m.roles.includes(r.id)).length;
    push(`   #${String(r.position).padStart(3, " ")}  ${r.name.padEnd(30)}  ${memberCount} members${flagStr}`);
  }
  push();

  if (bots.length) {
    push("─── BOTS ─────────────────────────────────────────────────────────────");
    for (const m of bots) {
      const u = m.user;
      const tag = u.username.toLowerCase().includes("shinel") ? "  [NEW · keep]" : "";
      push(`   🤖 ${u.username}${u.discriminator !== "0" ? "#" + u.discriminator : ""}  (id=${u.id})${tag}`);
    }
    push();
  }

  // Summary recommendations
  push("─── CLEANUP RECOMMENDATIONS ──────────────────────────────────────────");
  const emptyCats = cats.filter((c) => !(byParent[c.id] || []).length && !OUR_CATEGORIES.has(c.name));
  if (emptyCats.length) {
    push(`\n   Empty categories (safe to delete):`);
    for (const c of emptyCats) push(`     - ${c.name}  (id=${c.id})`);
  }
  if (dupes.length) {
    push(`\n   Duplicate channel names — pick which copy to keep, delete the others.`);
  }
  const moderationBots = bots.filter((m) =>
    /^(carl-?bot|dyno|probot|mee6|wickbot|ticket tool)/i.test(m.user.username)
  );
  if (moderationBots.length > 1) {
    push(`\n   Multiple moderation bots detected — usually you only need one:`);
    for (const m of moderationBots) push(`     - ${m.user.username}`);
    push(`     (Recommendation: keep one — Carl-bot is the most full-featured.)`);
  }
  push();
  push("─── NEXT STEPS ───────────────────────────────────────────────────────");
  push();
  push("   Reply with what to keep/delete using channel/role/category IDs above,");
  push("   and I'll write a cleanup-discord.mjs that does the deletes safely.");
  push();
  push("═".repeat(72));

  const report = lines.join("\n");
  writeFileSync(".discord-audit.txt", report);
  writeFileSync(
    ".discord-audit.json",
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        guild_id: GUILD_ID,
        guild_name: guild.name,
        counts: {
          channels: channels.length,
          categories: cats.length,
          roles: roles.length,
          members: members.length,
          bots: bots.length,
          empty_categories: emptyCats.length,
          duplicate_names: dupes.length,
        },
        categories: cats.map((c) => ({
          id: c.id, name: c.name, position: c.position,
          children: (byParent[c.id] || []).map((ch) => ({ id: ch.id, name: ch.name, type: TYPE_NAME[ch.type] || ch.type })),
        })),
        orphan_channels: orphans.map((c) => ({ id: c.id, name: c.name, type: TYPE_NAME[c.type] })),
        duplicate_names: dupes.map(([name, arr]) => ({ name, copies: arr.map((c) => ({ id: c.id, parent_id: c.parent_id })) })),
        roles: sortedRoles.map((r) => ({
          id: r.id, name: r.name, position: r.position, managed: !!r.managed,
          tags: r.tags || null, member_count: members.filter((m) => m.roles.includes(r.id)).length,
        })),
        bots: bots.map((m) => ({ id: m.user.id, username: m.user.username })),
      },
      null,
      2
    )
  );

  console.log(report);
  console.log(`\n📄 Saved: .discord-audit.txt + .discord-audit.json`);
}

main().catch((e) => {
  console.error("\n❌ FAILED:", e.message);
  process.exit(1);
});
