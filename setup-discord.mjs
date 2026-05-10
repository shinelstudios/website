#!/usr/bin/env node
/**
 * setup-discord.mjs — one-shot Discord scaffolding for Shinel Studios.
 *
 * Idempotent: re-running skips anything that already exists. Safe to run
 * repeatedly while iterating on the structure.
 *
 * What it does:
 *  - Creates "Team" role if missing (orange, hoisted)
 *  - Creates 3 new categories: SHINEL HQ, COCKPIT OPS (team-only), CLIENT CORNER
 *  - Creates child text channels under each
 *  - Sets read-only permissions on tracked-only client channels
 *  - Creates webhooks in ops-pipeline / finance / alerts
 *  - Writes the 3 webhook URLs to .discord-webhooks.json
 *  - Prints copy-pasteable wrangler commands at the end
 *
 * What it does NOT do:
 *  - Touch any existing categories or channels
 *  - Move existing channels (e.g. your existing kiaraa-gaming stays put)
 *  - Add anyone to the Team role (you do that manually in Discord)
 *  - Delete anything (ever)
 *
 * Requires Node 18+ (uses global fetch). Reads token from .discord-bot-token.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

// ---- config ---------------------------------------------------------------
const GUILD_ID = process.argv[2] || "1298972908193972255";
const TOKEN_FILE = ".discord-bot-token";

if (!existsSync(TOKEN_FILE)) {
  console.error(`\n❌ Missing token file "${TOKEN_FILE}".`);
  console.error(`Save your bot token first:`);
  console.error(`  "PASTE_TOKEN" | Out-File -Encoding ascii -NoNewline ${TOKEN_FILE}\n`);
  process.exit(1);
}
const TOKEN = readFileSync(TOKEN_FILE, "utf8").trim().replace(/^["']|["']$/g, "");
if (!TOKEN || TOKEN.split(".").length < 3) {
  console.error(`\n❌ Token in ${TOKEN_FILE} doesn't look right (should be 3 dot-separated parts). Re-copy from Discord developer portal.\n`);
  process.exit(1);
}

const API = "https://discord.com/api/v10";
const HEADERS = {
  Authorization: `Bot ${TOKEN}`,
  "Content-Type": "application/json",
  "User-Agent": "ShinelCockpitBot/1.0 (+https://shinelstudios.in)",
};

const TYPE = { TEXT: 0, VOICE: 2, CATEGORY: 4 };
const PERM = {
  VIEW_CHANNEL:         1n << 10n,
  SEND_MESSAGES:        1n << 11n,
  ADD_REACTIONS:        1n << 6n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  ATTACH_FILES:         1n << 15n,
  EMBED_LINKS:          1n << 14n,
};
const TEAM_ALLOW = String(
  PERM.VIEW_CHANNEL | PERM.SEND_MESSAGES | PERM.ADD_REACTIONS |
  PERM.READ_MESSAGE_HISTORY | PERM.ATTACH_FILES | PERM.EMBED_LINKS
);

// ---- the plan -------------------------------------------------------------
const CLIENTS = [
  { slug: "aish-is-live",       managed: true,  topic: "@aish.is.live · YouTube + Instagram · managed" },
  { slug: "ap-sports-arena",    managed: true,  topic: "AP Sports Arena · YouTube · managed" },
  { slug: "gamify-with-anchit", managed: true,  topic: "@gamifywithanchit · YouTube + Instagram · managed" },
  { slug: "kamz-inkzone",       managed: true,  topic: "Kamz Inkzone · 3 YT channels + Instagram · managed" },
  { slug: "kiaraa-gaming",      managed: true,  topic: "@kiaraa.gaming · YouTube + Instagram · managed" },
  { slug: "kundan-parashar",    managed: true,  topic: "@kundanparashar · YouTube · managed" },
  { slug: "shinel-studios-int", managed: true,  topic: "Internal — Shinel Studios' own content" },
  { slug: "deadlox-gaming",     managed: false, topic: "TRACKED ONLY · read-only · we monitor but don't publish" },
  { slug: "vib-n-ric",          managed: false, topic: "TRACKED ONLY · read-only · we monitor but don't publish" },
];

const PLAN = [
  {
    category: "🏢 SHINEL HQ",
    teamOnly: false,
    channels: [
      { name: "announcements", topic: "Founder posts only — quiet and important" },
      { name: "wins",          topic: "🎉 Auto-pings when projects ship · pin the celebrations" },
    ],
  },
  {
    category: "🤖 COCKPIT OPS",
    teamOnly: true,
    channels: [
      { name: "ops-pipeline", topic: "Cockpit posts: posted / on-website / auto-promote", webhook: "cockpit-ops" },
      { name: "finance",      topic: "Cockpit posts: paid events / payouts / weekly digest", webhook: "cockpit-finance" },
      { name: "alerts",       topic: "Cockpit alerts: spikes / errors / cron health · keep this quiet", webhook: "cockpit-alerts" },
      { name: "audit-log",    topic: "Verbose agent_log dump (optional, can be muted)" },
    ],
  },
  {
    category: "📁 CLIENT CORNER",
    teamOnly: false,
    channels: CLIENTS.map((c) => ({
      name: c.slug,
      topic: c.topic,
      readOnly: !c.managed,
    })),
  },
];

// ---- HTTP -----------------------------------------------------------------
async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    const retry = (j.retry_after || 1) * 1000 + 200;
    console.log(`  ⏳ rate-limited, sleeping ${retry}ms…`);
    await new Promise((r) => setTimeout(r, retry));
    return api(method, path, body);
  }
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error(`UNAUTHORIZED — token is invalid or expired. Reset in Discord developer portal and update ${TOKEN_FILE}.`);
    }
    if (res.status === 403) {
      throw new Error(`FORBIDDEN (${path}) — bot lacks permission. Verify the OAuth invite gave it Administrator and that it's actually in the server.`);
    }
    if (res.status === 404 && path.startsWith(`/guilds/${GUILD_ID}`)) {
      throw new Error(`GUILD NOT FOUND — bot isn't in server ${GUILD_ID}. Re-run the OAuth URL Generator and authorize.`);
    }
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---- main -----------------------------------------------------------------
async function main() {
  console.log(`\n🤖 Connecting to guild ${GUILD_ID}…`);
  const [guild, channels, roles] = await Promise.all([
    api("GET", `/guilds/${GUILD_ID}`),
    api("GET", `/guilds/${GUILD_ID}/channels`),
    api("GET", `/guilds/${GUILD_ID}/roles`),
  ]);
  console.log(`✓ "${guild.name}" — ${channels.length} channels, ${roles.length} roles\n`);

  // ---- Team role
  let team = roles.find((r) => r.name.toLowerCase() === "team");
  if (!team) {
    console.log("+ Creating role: Team");
    team = await api("POST", `/guilds/${GUILD_ID}/roles`, {
      name: "Team",
      color: 0xe85002, // Shinel orange
      hoist: true,
      mentionable: true,
      permissions: "0",
    });
    console.log(`  ✓ id=${team.id} — assign yourself + editors to this role in Discord`);
  } else {
    console.log(`✓ Role "Team" exists (id=${team.id})`);
  }
  const everyoneId = GUILD_ID; // @everyone role id == guild id

  // ---- Walk the plan
  const webhooksOut = {};
  for (const cat of PLAN) {
    let category = channels.find((c) => c.type === TYPE.CATEGORY && c.name === cat.category);
    if (!category) {
      console.log(`\n+ Category: ${cat.category}${cat.teamOnly ? " (team-only)" : ""}`);
      const overwrites = cat.teamOnly
        ? [
            { id: everyoneId, type: 0, allow: "0", deny: String(PERM.VIEW_CHANNEL) },
            { id: team.id,    type: 0, allow: TEAM_ALLOW, deny: "0" },
          ]
        : [];
      category = await api("POST", `/guilds/${GUILD_ID}/channels`, {
        name: cat.category,
        type: TYPE.CATEGORY,
        permission_overwrites: overwrites,
      });
      console.log(`  ✓ created (id=${category.id})`);
    } else {
      console.log(`\n✓ Category exists: ${cat.category}`);
    }

    for (const ch of cat.channels) {
      // exists under THIS category?
      let existing = channels.find(
        (c) => c.type === TYPE.TEXT && c.name === ch.name && c.parent_id === category.id
      );
      // exists elsewhere? — leave it alone, just track id for webhook step
      const elsewhere = !existing &&
        channels.find((c) => c.type === TYPE.TEXT && c.name === ch.name);

      if (!existing && !elsewhere) {
        const overwrites = [];
        if (ch.readOnly) {
          overwrites.push({
            id: everyoneId, type: 0,
            allow: String(PERM.VIEW_CHANNEL | PERM.READ_MESSAGE_HISTORY),
            deny: String(PERM.SEND_MESSAGES | PERM.ADD_REACTIONS | PERM.ATTACH_FILES),
          });
          overwrites.push({
            id: team.id, type: 0,
            allow: TEAM_ALLOW, deny: "0",
          });
        }
        const created = await api("POST", `/guilds/${GUILD_ID}/channels`, {
          name: ch.name,
          type: TYPE.TEXT,
          parent_id: category.id,
          topic: ch.topic || undefined,
          permission_overwrites: overwrites.length ? overwrites : undefined,
        });
        console.log(`  + #${ch.name}${ch.readOnly ? " (read-only)" : ""}`);
        existing = created;
        // also push to in-memory list so subsequent loop iterations see it
        channels.push(created);
      } else if (elsewhere) {
        console.log(`  ⚠ #${ch.name} exists elsewhere (id=${elsewhere.id}) — left in place`);
        existing = elsewhere;
      } else {
        console.log(`  ✓ #${ch.name}`);
      }

      // webhook?
      if (ch.webhook) {
        const hooks = await api("GET", `/channels/${existing.id}/webhooks`);
        let hook = hooks.find((h) => h.name === ch.webhook);
        if (!hook) {
          hook = await api("POST", `/channels/${existing.id}/webhooks`, { name: ch.webhook });
          console.log(`    + webhook: ${ch.webhook}`);
        } else {
          console.log(`    ✓ webhook: ${ch.webhook}`);
        }
        const url = `https://discord.com/api/webhooks/${hook.id}/${hook.token}`;
        webhooksOut[ch.webhook] = url;
      }
    }
  }

  // ---- save webhooks
  const out = {
    generated_at: new Date().toISOString(),
    guild_id: GUILD_ID,
    guild_name: guild.name,
    team_role_id: team.id,
    webhooks: webhooksOut,
  };
  writeFileSync(".discord-webhooks.json", JSON.stringify(out, null, 2));

  const SECRET_FOR = {
    "cockpit-ops":     "DISCORD_OPS_WEBHOOK_URL",
    "cockpit-finance": "DISCORD_FINANCE_WEBHOOK_URL",
    "cockpit-alerts":  "DISCORD_WEBHOOK_URL",
  };

  console.log("\n" + "═".repeat(64));
  console.log("✅ Discord setup complete");
  console.log("═".repeat(64));
  console.log("\nWebhook URLs saved → .discord-webhooks.json (gitignored)");
  console.log("\nNext steps — set the cockpit secrets:\n");
  console.log(`  cd worker`);
  for (const [name, url] of Object.entries(webhooksOut)) {
    const secret = SECRET_FOR[name] || name;
    console.log(`  npx wrangler secret put ${secret}`);
    console.log(`    paste: ${url}\n`);
  }
  console.log(`  npx wrangler deploy`);
  console.log("\nThen in Discord:");
  console.log(`  - Add yourself + editors to the new "Team" role (right-click member → Roles → Team)`);
  console.log(`  - Mute #audit-log unless you want the firehose`);
  console.log(`  - Drag categories into your preferred order in the sidebar`);
  console.log();
}

main().catch((e) => {
  console.error("\n❌ FAILED:", e.message);
  if (e.stack) console.error(e.stack.split("\n").slice(1, 4).join("\n"));
  process.exit(1);
});
