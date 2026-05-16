#!/usr/bin/env node
/**
 * restructure-discord.mjs — full cleanup + permission lockdown.
 *
 * Idempotent. Re-running is safe — all operations check current state first.
 *
 * PRE-REQUIREMENT (manual, one-time):
 *   In Discord → Server Settings → Roles, drag "Shinel Cockpit Bot" role
 *   to position #2 (right under Owner). Without this, deleting roles like
 *   "TEAM SHINEL" and "Carl-bot" will fail with 403 because the bot's role
 *   is currently at position #1 — Discord forbids managing roles above
 *   one's own.
 *
 * Phases:
 *   0  Pre-flight: verify bot role position
 *   1  Create 🌐 PUBLIC + #shinel-uploads + #client-uploads + per-client + per-editor roles
 *   2  Move existing public channels into 🌐 PUBLIC; team channels into 🏢 INTERNAL HQ
 *   3  Rename "🏢 SHINEL HQ" → "🏢 INTERNAL HQ"; "Kiaraa Gaming Team" → "Client · Kiaraa"
 *   4  Lock down permissions (per-category + per-channel overwrites)
 *   5  Migrate members from "TEAM SHINEL" role → "Team" role
 *   6  Delete deprecated channels (one by one)
 *   7  Delete now-empty deprecated categories
 *   8  Delete deprecated roles (community demographics)
 *   9  Kick deprecated bots
 *  10  Save webhook URLs + print next steps
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

const TYPE = { TEXT: 0, VOICE: 2, CATEGORY: 4, FORUM: 15 };
const TYPE_NAME = { 0: "text", 2: "voice", 4: "cat", 5: "news", 13: "stage", 15: "forum" };

const PERM = {
  VIEW_CHANNEL:         1n << 10n,
  SEND_MESSAGES:        1n << 11n,
  ADD_REACTIONS:        1n << 6n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  ATTACH_FILES:         1n << 15n,
  EMBED_LINKS:          1n << 14n,
  CONNECT:              1n << 20n, // voice
  SPEAK:                1n << 21n,
};
const VIEW_ALL = String(
  PERM.VIEW_CHANNEL | PERM.SEND_MESSAGES | PERM.ADD_REACTIONS |
  PERM.READ_MESSAGE_HISTORY | PERM.ATTACH_FILES | PERM.EMBED_LINKS |
  PERM.CONNECT | PERM.SPEAK
);
const VIEW_READONLY = String(PERM.VIEW_CHANNEL | PERM.READ_MESSAGE_HISTORY);

// ---- HTTP -----------------------------------------------------------------
let API_CALLS = 0;
async function api(method, path, body) {
  API_CALLS++;
  const res = await fetch(`${API}${path}`, {
    method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    const ms = ((j.retry_after || 1) * 1000) + 200;
    console.log(`     ⏳ rate-limited, sleep ${ms}ms`);
    await new Promise((r) => setTimeout(r, ms));
    return api(method, path, body);
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${t.slice(0, 240)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}
const tryApi = async (method, path, body, label) => {
  try { return { ok: true, data: await api(method, path, body) }; }
  catch (e) { console.log(`   ✗ ${label || path}: ${e.message.slice(0, 120)}`); return { ok: false, error: e }; }
};

// ---- the plan -------------------------------------------------------------

// Channels we MOVE into 🌐 PUBLIC (existing channels, kept as-is otherwise)
const MOVE_TO_PUBLIC = [
  "🧃┃welcome", "🧃┃server-rules",
  "📌┃announcements", "📌┃contact",
  "🍁┃chit-chat", "🍁┃shinel-shorts", "🍁┃shinel-thumbnails", "🍁┃shinel-videos",
  "💻┃hire-an-editor", "💻┃Editor's-vc",
];

// Channels we MOVE into 🏢 INTERNAL HQ
const MOVE_TO_INTERNAL_HQ = [
  "💠┃team-chat", "💠┃team-commands", "💠┃meeting-reminders",
  "💠┃Team VC", "💠┃shinel-projetcs",
];

// New channels to create
const NEW_CHANNELS_PUBLIC = [
  { name: "shinel-uploads", topic: "🎬 Shinel Studios uploads — auto-pings on new YouTube/social posts", webhook: "shinel-uploads-feed" },
];
const NEW_CHANNELS_INTERNAL = [
  { name: "client-uploads", topic: "🛰 All managed clients' uploads — feed", webhook: "client-uploads-feed" },
];

// Channels to delete outright (by exact name)
const DELETE_CHANNELS = [
  "🧃┃invite-link", "🧃┃server-roles", "🧃┃left",
  "📌┃content", "📌┃updates", "📌┃introduction",
  "📍┃tickets", "📍┃giveaways", "📍┃scammer-alert", "📍┃paid-promotions",
  "🍁┃memes", "🍁┃cmds",
  "🎈┃for-you", "🎈┃gfx-packs", "🎈┃thumbnail-ideas", "🎈┃thumbnail-backgrounds",
  "⛄┃client-inquiries", "⛄┃project-discussions", "⛄┃reviews-reviews",
  "💻┃editor-discussions", "💻┃editor-infos", "💻┃tips-and-resources",
  "collaboration-corner-🤝", "creator-showcase-🌟", "discord_talks",
  "💠┃team-announcements", "💠┃team-alerts",
];

// Old "kiaraa-gaming" channel (the duplicate under OLD Client Corner) — delete by ID since name collides
const DELETE_CHANNEL_IDS = [
  "1450416577475514444", // ⛄┃kiaraa-gaming under OLD Client Corner (NOT the new one)
];

// Categories to delete after their children are moved/deleted
const DELETE_CATEGORIES = [
  "《🧃~Arrivals ~🧃 》",
  "《📌~INFORMATION  ~📌 》",
  "《📍~Important~📍 》",
  "《🍁~General~🍁 》",
  "《🎈~preferences~🎈 》",
  "《⛄~ Client Corner ~⛄ 》",
  "《💻~Editor's Lounge~💻 》",
  "《🤝~  Collaboration Spaces ~🤝 》",
  "《💠~  TEAM SHINEL ~💠 》",
];

// Roles to create (per-client, per-editor)
const CLIENT_ROLES = [
  "Client · AiSH",
  "Client · APSports",
  "Client · Anchit",
  "Client · Kamz",
  "Client · Kundan",
];
const EDITOR_ROLES = [
  "Editor · Suyash",
  "Editor · Manan",
  "Editor · DK",
];

// Maps client channel name → which Client role can see it
const CLIENT_CHANNEL_TO_ROLE = {
  "aish-is-live":       "Client · AiSH",
  "ap-sports-arena":    "Client · APSports",
  "gamify-with-anchit": "Client · Anchit",
  "kamz-inkzone":       "Client · Kamz",
  "kiaraa-gaming":      "Client · Kiaraa",
  "kundan-parashar":    "Client · Kundan",
  // shinel-studios-int, deadlox-gaming, vib-n-ric: admin/manager only (no client role)
};
const TRACKED_ONLY = new Set(["deadlox-gaming", "vib-n-ric", "shinel-studios-int"]);

const RENAME_ROLES = [
  { from: "Kiaraa Gaming Team", to: "Client · Kiaraa" },
];

const ROLES_TO_DELETE = ["Male", "Female", "18+", "18-", "Youtuber", "Member"];
const ROLE_MIGRATIONS = [{ from: "TEAM SHINEL", to: "Team" }]; // migrate members then delete `from`

const BOTS_TO_KICK = [
  { name: "Dyno",        id: "155149108183695360" },
  { name: "ProBot ✨",     id: "282859044593598464" },
  { name: "ServerStats", id: "458276816071950337" },
  { name: "Statbot",     id: "491769129318088714" },
  { name: "R.O.T.I",     id: "903690362114158632" },
];

// ---- main -----------------------------------------------------------------
async function main() {
  const t0 = Date.now();

  console.log("\n🔧 Discord restructure starting…\n");

  // ---- gather state
  const [guild, me] = await Promise.all([
    api("GET", `/guilds/${GUILD_ID}?with_counts=true`),
    api("GET", `/users/@me`),
  ]);
  console.log(`✓ Guild "${guild.name}" · bot=@${me.username}`);

  let [channels, roles, members] = await Promise.all([
    api("GET", `/guilds/${GUILD_ID}/channels`),
    api("GET", `/guilds/${GUILD_ID}/roles`),
    paginatedMembers(GUILD_ID),
  ]);
  console.log(`  ${channels.length} channels · ${roles.length} roles · ${members.length} members\n`);

  const everyoneId = GUILD_ID;
  const refresh = async () => {
    [channels, roles] = await Promise.all([
      api("GET", `/guilds/${GUILD_ID}/channels`),
      api("GET", `/guilds/${GUILD_ID}/roles`),
    ]);
  };
  const findChan   = (name) => channels.find((c) => c.name === name);
  const findChanId = (id)   => channels.find((c) => c.id === id);
  const findCat    = (name) => channels.find((c) => c.type === TYPE.CATEGORY && c.name === name);
  const findRole   = (name) => roles.find((r) => r.name === name);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 0 — Pre-flight
  // ─────────────────────────────────────────────────────────────────────────
  console.log("─── Phase 0: pre-flight ─────────────────────────────────────");
  const botMember = members.find((m) => m.user?.id === me.id);
  const botRoleIds = new Set(botMember?.roles || []);
  const botRolePositions = roles
    .filter((r) => botRoleIds.has(r.id))
    .map((r) => r.position);
  const botTopPos = Math.max(0, ...botRolePositions);

  const ownerPos = roles.find((r) => r.name === "Owner")?.position ?? 999;
  const teamShinelPos = roles.find((r) => r.name === "TEAM SHINEL")?.position ?? 0;
  const adminPos = roles.find((r) => r.name === "Admin")?.position ?? 0;

  console.log(`  bot top role position: ${botTopPos}`);
  console.log(`  Owner: ${ownerPos} · Admin: ${adminPos} · TEAM SHINEL: ${teamShinelPos}`);

  if (botTopPos <= teamShinelPos) {
    console.log(`\n  ⚠  Bot role is BELOW some roles we need to delete (TEAM SHINEL @ ${teamShinelPos}).`);
    console.log(`  ⚠  Drag "Shinel Cockpit Bot" role to position right under Owner in Server Settings → Roles.`);
    console.log(`  ⚠  Phases 1-4 will still run (channels/perms work via Admin perm), but Phase 5/8/9 will partially fail.\n`);
  } else {
    console.log(`  ✓ Bot role is high enough to manage subordinate roles\n`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1 — Create new structures
  // ─────────────────────────────────────────────────────────────────────────
  console.log("─── Phase 1: create new categories, channels, roles ─────────");

  // 1a. Create 🌐 PUBLIC category (allows @everyone view)
  let publicCat = findCat("🌐 PUBLIC");
  if (!publicCat) {
    console.log("  + Creating category: 🌐 PUBLIC");
    publicCat = await api("POST", `/guilds/${GUILD_ID}/channels`, {
      name: "🌐 PUBLIC", type: TYPE.CATEGORY,
    });
    channels.push(publicCat);
  } else {
    console.log("  ✓ 🌐 PUBLIC exists");
  }

  // 1b. Rename 🏢 SHINEL HQ → 🏢 INTERNAL HQ
  let internalCat = findCat("🏢 INTERNAL HQ") || findCat("🏢 SHINEL HQ");
  if (internalCat && internalCat.name !== "🏢 INTERNAL HQ") {
    console.log("  ↻ Renaming 🏢 SHINEL HQ → 🏢 INTERNAL HQ");
    internalCat = await api("PATCH", `/channels/${internalCat.id}`, { name: "🏢 INTERNAL HQ" });
  } else if (internalCat) {
    console.log("  ✓ 🏢 INTERNAL HQ exists");
  } else {
    console.log("  + Creating category: 🏢 INTERNAL HQ");
    internalCat = await api("POST", `/guilds/${GUILD_ID}/channels`, {
      name: "🏢 INTERNAL HQ", type: TYPE.CATEGORY,
    });
    channels.push(internalCat);
  }

  let cockpitCat = findCat("🤖 COCKPIT OPS");
  let clientCornerCat = findCat("📁 CLIENT CORNER");

  // 1c. Create per-client + per-editor + Team roles
  const wantedRoles = [
    ...CLIENT_ROLES.map((n) => ({ name: n, color: 0x3498db })),  // blue
    ...EDITOR_ROLES.map((n) => ({ name: n, color: 0x2ecc71 })),  // green
  ];
  for (const r of wantedRoles) {
    if (!findRole(r.name)) {
      console.log(`  + Role: ${r.name}`);
      const created = await api("POST", `/guilds/${GUILD_ID}/roles`, {
        name: r.name, color: r.color, hoist: false, mentionable: true, permissions: "0",
      });
      roles.push(created);
    }
  }

  // 1d. Rename Kiaraa Gaming Team → Client · Kiaraa
  for (const ren of RENAME_ROLES) {
    const r = findRole(ren.from);
    if (r && !findRole(ren.to)) {
      console.log(`  ↻ Role rename: ${ren.from} → ${ren.to}`);
      await api("PATCH", `/guilds/${GUILD_ID}/roles/${r.id}`, { name: ren.to });
      r.name = ren.to;
    } else if (r && findRole(ren.to)) {
      console.log(`  ⚠ Both "${ren.from}" and "${ren.to}" exist — leaving rename for manual decision`);
    }
  }

  await refresh();

  // 1e. Create #shinel-uploads + #client-uploads with webhooks
  const webhooksOut = {};
  for (const ch of NEW_CHANNELS_PUBLIC) {
    let existing = findChan(ch.name);
    if (!existing) {
      console.log(`  + #${ch.name} (in 🌐 PUBLIC)`);
      existing = await api("POST", `/guilds/${GUILD_ID}/channels`, {
        name: ch.name, type: TYPE.TEXT, parent_id: publicCat.id, topic: ch.topic,
      });
      channels.push(existing);
    } else if (existing.parent_id !== publicCat.id) {
      console.log(`  ↻ moving #${ch.name} → 🌐 PUBLIC`);
      await tryApi("PATCH", `/channels/${existing.id}`, { parent_id: publicCat.id, lock_permissions: false }, `move #${ch.name}`);
    } else {
      console.log(`  ✓ #${ch.name}`);
    }
    if (ch.webhook) {
      const hooks = await api("GET", `/channels/${existing.id}/webhooks`);
      let h = hooks.find((x) => x.name === ch.webhook);
      if (!h) h = await api("POST", `/channels/${existing.id}/webhooks`, { name: ch.webhook });
      webhooksOut[ch.webhook] = `https://discord.com/api/webhooks/${h.id}/${h.token}`;
    }
  }
  for (const ch of NEW_CHANNELS_INTERNAL) {
    let existing = findChan(ch.name);
    if (!existing) {
      console.log(`  + #${ch.name} (in 🏢 INTERNAL HQ)`);
      existing = await api("POST", `/guilds/${GUILD_ID}/channels`, {
        name: ch.name, type: TYPE.TEXT, parent_id: internalCat.id, topic: ch.topic,
      });
      channels.push(existing);
    } else if (existing.parent_id !== internalCat.id) {
      console.log(`  ↻ moving #${ch.name} → 🏢 INTERNAL HQ`);
      await tryApi("PATCH", `/channels/${existing.id}`, { parent_id: internalCat.id, lock_permissions: false }, `move #${ch.name}`);
    } else {
      console.log(`  ✓ #${ch.name}`);
    }
    if (ch.webhook) {
      const hooks = await api("GET", `/channels/${existing.id}/webhooks`);
      let h = hooks.find((x) => x.name === ch.webhook);
      if (!h) h = await api("POST", `/channels/${existing.id}/webhooks`, { name: ch.webhook });
      webhooksOut[ch.webhook] = `https://discord.com/api/webhooks/${h.id}/${h.token}`;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2 — Move existing channels into the new categories
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 2: move existing channels ─────────────────────────");
  for (const name of MOVE_TO_PUBLIC) {
    const ch = findChan(name);
    if (!ch) { console.log(`  · ${name} — not found, skipping`); continue; }
    if (ch.parent_id === publicCat.id) { console.log(`  ✓ ${name}`); continue; }
    console.log(`  ↻ ${name} → 🌐 PUBLIC`);
    await tryApi("PATCH", `/channels/${ch.id}`, { parent_id: publicCat.id, lock_permissions: false }, `move ${name}`);
  }
  for (const name of MOVE_TO_INTERNAL_HQ) {
    const ch = findChan(name);
    if (!ch) { console.log(`  · ${name} — not found, skipping`); continue; }
    if (ch.parent_id === internalCat.id) { console.log(`  ✓ ${name}`); continue; }
    console.log(`  ↻ ${name} → 🏢 INTERNAL HQ`);
    await tryApi("PATCH", `/channels/${ch.id}`, { parent_id: internalCat.id, lock_permissions: false }, `move ${name}`);
  }
  await refresh();

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 3 — Permissions lockdown
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 3: permission lockdown ────────────────────────────");
  const teamRole    = findRole("Team");
  const adminRole   = findRole("Admin");
  const managerRole = findRole("Manager");
  const ownerRole   = findRole("Owner");

  if (!teamRole)    console.log("  ⚠ Team role missing — run setup-discord.mjs first");
  if (!adminRole)   console.log("  ⚠ Admin role missing");
  if (!managerRole) console.log("  ⚠ Manager role missing");

  // 3a. INTERNAL HQ — Team+ visible, public hidden
  if (internalCat) {
    const ows = [
      { id: everyoneId,       type: 0, allow: "0",      deny: String(PERM.VIEW_CHANNEL) },
      ...(teamRole    ? [{ id: teamRole.id,    type: 0, allow: VIEW_ALL, deny: "0" }] : []),
      ...(adminRole   ? [{ id: adminRole.id,   type: 0, allow: VIEW_ALL, deny: "0" }] : []),
      ...(managerRole ? [{ id: managerRole.id, type: 0, allow: VIEW_ALL, deny: "0" }] : []),
    ];
    console.log(`  🔒 🏢 INTERNAL HQ category — Team+ only`);
    await tryApi("PATCH", `/channels/${internalCat.id}`, { permission_overwrites: ows }, "lock INTERNAL HQ");
  }

  // 3b. COCKPIT OPS — Admin/Manager ONLY (not all team)
  if (cockpitCat) {
    const ows = [
      { id: everyoneId,           type: 0, allow: "0",      deny: String(PERM.VIEW_CHANNEL) },
      ...(adminRole   ? [{ id: adminRole.id,   type: 0, allow: VIEW_ALL, deny: "0" }] : []),
      ...(managerRole ? [{ id: managerRole.id, type: 0, allow: VIEW_ALL, deny: "0" }] : []),
    ];
    console.log(`  🔒 🤖 COCKPIT OPS category — Admin+Manager only`);
    await tryApi("PATCH", `/channels/${cockpitCat.id}`, { permission_overwrites: ows }, "lock COCKPIT OPS");
  }

  // 3c. CLIENT CORNER category — base lockout: only Admin+Manager see by default
  if (clientCornerCat) {
    const ows = [
      { id: everyoneId,           type: 0, allow: "0",      deny: String(PERM.VIEW_CHANNEL) },
      ...(adminRole   ? [{ id: adminRole.id,   type: 0, allow: VIEW_ALL, deny: "0" }] : []),
      ...(managerRole ? [{ id: managerRole.id, type: 0, allow: VIEW_ALL, deny: "0" }] : []),
    ];
    console.log(`  🔒 📁 CLIENT CORNER category — Admin+Manager base`);
    await tryApi("PATCH", `/channels/${clientCornerCat.id}`, { permission_overwrites: ows }, "lock CLIENT CORNER");

    // 3d. Per-channel overrides: each client channel adds its Client·X role
    await refresh();
    for (const ch of channels.filter((c) => c.parent_id === clientCornerCat.id)) {
      const clientRoleName = CLIENT_CHANNEL_TO_ROLE[ch.name];
      const isTracked = TRACKED_ONLY.has(ch.name);
      const ows = [
        { id: everyoneId, type: 0, allow: "0", deny: String(PERM.VIEW_CHANNEL) },
        ...(adminRole   ? [{ id: adminRole.id,   type: 0, allow: VIEW_ALL, deny: "0" }] : []),
        ...(managerRole ? [{ id: managerRole.id, type: 0, allow: VIEW_ALL, deny: "0" }] : []),
      ];
      if (clientRoleName && !isTracked) {
        const cr = findRole(clientRoleName);
        if (cr) {
          // Client can VIEW + send + react, but no audit-style perms
          ows.push({
            id: cr.id, type: 0,
            allow: String(PERM.VIEW_CHANNEL | PERM.SEND_MESSAGES | PERM.READ_MESSAGE_HISTORY | PERM.ADD_REACTIONS | PERM.ATTACH_FILES | PERM.EMBED_LINKS),
            deny: "0",
          });
        }
      }
      console.log(`     #${ch.name}${isTracked ? " (tracked-only · admin+manager only)" : clientRoleName ? ` + ${clientRoleName}` : ""}`);
      await tryApi("PATCH", `/channels/${ch.id}`, { permission_overwrites: ows, lock_permissions: false }, `lock #${ch.name}`);
    }
  }

  // 3e. PUBLIC category — visible to @everyone explicitly (overrides any inherited deny)
  if (publicCat) {
    const ows = [
      { id: everyoneId, type: 0, allow: VIEW_READONLY, deny: "0" },
    ];
    console.log(`  🌐 🌐 PUBLIC category — @everyone read-only base; chat channels inherit and add send`);
    await tryApi("PATCH", `/channels/${publicCat.id}`, { permission_overwrites: ows }, "open PUBLIC");

    // For each public channel, allow send + react for @everyone (except #announcements + uploads which are read-only)
    await refresh();
    const READONLY_PUBLIC = new Set(["🧃┃server-rules", "📌┃announcements", "shinel-uploads"]);
    for (const ch of channels.filter((c) => c.parent_id === publicCat.id)) {
      const readOnly = READONLY_PUBLIC.has(ch.name);
      if (ch.type === TYPE.TEXT || ch.type === TYPE.FORUM) {
        const ows = readOnly
          ? [{ id: everyoneId, type: 0, allow: VIEW_READONLY, deny: String(PERM.SEND_MESSAGES) }]
          : [{ id: everyoneId, type: 0, allow: String(PERM.VIEW_CHANNEL | PERM.READ_MESSAGE_HISTORY | PERM.SEND_MESSAGES | PERM.ADD_REACTIONS | PERM.ATTACH_FILES | PERM.EMBED_LINKS), deny: "0" }];
        await tryApi("PATCH", `/channels/${ch.id}`, { permission_overwrites: ows, lock_permissions: false }, `set perms #${ch.name}`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 4 — Migrate "TEAM SHINEL" role members → "Team" role
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 4: role migrations ────────────────────────────────");
  for (const mig of ROLE_MIGRATIONS) {
    const fromR = findRole(mig.from);
    const toR   = findRole(mig.to);
    if (!fromR || !toR) {
      console.log(`  · skip migration ${mig.from} → ${mig.to} (one or both missing)`);
      continue;
    }
    const holders = members.filter((m) => m.roles.includes(fromR.id));
    console.log(`  ↻ ${mig.from} → ${mig.to}: ${holders.length} member(s)`);
    for (const m of holders) {
      const tag = m.user.username;
      if (!m.roles.includes(toR.id)) {
        const r = await tryApi("PUT", `/guilds/${GUILD_ID}/members/${m.user.id}/roles/${toR.id}`, undefined, `+Team @${tag}`);
        if (r.ok) console.log(`     + Team → @${tag}`);
      }
      await tryApi("DELETE", `/guilds/${GUILD_ID}/members/${m.user.id}/roles/${fromR.id}`, undefined, `-${mig.from} @${tag}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 5 — Delete deprecated channels
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 5: delete deprecated channels ─────────────────────");
  await refresh();
  for (const id of DELETE_CHANNEL_IDS) {
    const ch = findChanId(id);
    if (!ch) continue;
    console.log(`  ✗ #${ch.name} (id=${id})`);
    await tryApi("DELETE", `/channels/${id}`, undefined, `delete ${ch.name}`);
  }
  for (const name of DELETE_CHANNELS) {
    const ch = findChan(name);
    if (!ch) { console.log(`  · ${name} — already gone`); continue; }
    console.log(`  ✗ ${name}`);
    await tryApi("DELETE", `/channels/${ch.id}`, undefined, `delete ${name}`);
  }
  await refresh();

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 6 — Delete now-empty deprecated categories
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 6: delete empty categories ────────────────────────");
  for (const name of DELETE_CATEGORIES) {
    const cat = findCat(name);
    if (!cat) { console.log(`  · "${name}" — already gone`); continue; }
    const stillHasChildren = channels.filter((c) => c.parent_id === cat.id).length;
    if (stillHasChildren > 0) {
      console.log(`  · "${name}" — still has ${stillHasChildren} child channel(s), skipping`);
      continue;
    }
    console.log(`  ✗ "${name}"`);
    await tryApi("DELETE", `/channels/${cat.id}`, undefined, `delete cat ${name}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 7 — Delete deprecated roles
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 7: delete deprecated roles ────────────────────────");
  await refresh();
  // Refresh members so post-migration role lists are accurate
  members = await paginatedMembers(GUILD_ID);
  for (const name of ROLES_TO_DELETE) {
    const r = findRole(name);
    if (!r) { console.log(`  · ${name} — already gone`); continue; }
    if (r.position >= botTopPos) {
      console.log(`  ⚠ ${name} (position ${r.position}) >= bot top role (${botTopPos}) — skip; bump bot role higher and re-run`);
      continue;
    }
    console.log(`  ✗ role ${name}`);
    await tryApi("DELETE", `/guilds/${GUILD_ID}/roles/${r.id}`, undefined, `delete role ${name}`);
  }
  // Now delete TEAM SHINEL after migration
  const oldTeamRole = findRole("TEAM SHINEL");
  if (oldTeamRole) {
    if (oldTeamRole.position >= botTopPos) {
      console.log(`  ⚠ TEAM SHINEL (position ${oldTeamRole.position}) >= bot top role (${botTopPos}) — skip`);
    } else {
      console.log(`  ✗ role TEAM SHINEL`);
      await tryApi("DELETE", `/guilds/${GUILD_ID}/roles/${oldTeamRole.id}`, undefined, "delete role TEAM SHINEL");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 8 — Kick deprecated bots
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 8: kick deprecated bots ───────────────────────────");
  for (const bot of BOTS_TO_KICK) {
    const m = members.find((mm) => mm.user?.id === bot.id);
    if (!m) { console.log(`  · ${bot.name} — not in server`); continue; }
    // Check role hierarchy: bot's highest role must be > target's highest role
    const targetTop = Math.max(0, ...roles.filter((r) => m.roles.includes(r.id)).map((r) => r.position));
    if (targetTop >= botTopPos) {
      console.log(`  ⚠ ${bot.name}: top role pos ${targetTop} >= bot ${botTopPos}, skip; bump bot role higher and re-run`);
      continue;
    }
    console.log(`  ✗ kick ${bot.name}`);
    await tryApi("DELETE", `/guilds/${GUILD_ID}/members/${bot.id}`, undefined, `kick ${bot.name}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 9 — Save webhook URLs + summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n─── Phase 9: save webhooks + summary ────────────────────────");

  // Merge with previous webhooks file if present
  let prev = {};
  try { prev = JSON.parse(readFileSync(".discord-webhooks.json", "utf8")); } catch {}
  const allHooks = { ...(prev.webhooks || {}), ...webhooksOut };
  const out = {
    generated_at: new Date().toISOString(),
    guild_id: GUILD_ID,
    guild_name: guild.name,
    webhooks: allHooks,
    api_calls: API_CALLS,
    duration_seconds: ((Date.now() - t0) / 1000).toFixed(1),
  };
  writeFileSync(".discord-webhooks.json", JSON.stringify(out, null, 2));

  console.log("\n" + "═".repeat(72));
  console.log(`✅ Restructure complete · ${API_CALLS} API calls · ${out.duration_seconds}s`);
  console.log("═".repeat(72));

  console.log("\nNew webhooks (saved to .discord-webhooks.json):");
  for (const [name, url] of Object.entries(webhooksOut)) {
    console.log(`  ${name.padEnd(22)} ${url}`);
  }

  console.log("\nNext: set the new upload-feed secrets on the worker:\n");
  console.log("  cd worker");
  if (webhooksOut["shinel-uploads-feed"]) {
    console.log("  npx wrangler secret put DISCORD_SHINEL_UPLOADS_WEBHOOK_URL");
    console.log(`    paste: ${webhooksOut["shinel-uploads-feed"]}`);
  }
  if (webhooksOut["client-uploads-feed"]) {
    console.log("  npx wrangler secret put DISCORD_CLIENT_UPLOADS_WEBHOOK_URL");
    console.log(`    paste: ${webhooksOut["client-uploads-feed"]}`);
  }
  console.log("  npx wrangler deploy\n");

  console.log("Manual follow-ups in Discord:");
  console.log("  - Drag categories into preferred order in the sidebar");
  console.log("  - Add yourself + leads to the new role hierarchy:");
  console.log("      · Team ← full-time editors + you");
  console.log("      · Editor · Suyash / Manan / DK ← per-editor");
  console.log("      · Client · AiSH / Anchit / Kamz / Kiaraa / Kundan / APSports ← per-client");
  console.log("  - Configure Carl-bot mod-log channel pointer (Carl-bot dashboard)");
  console.log("  - Mute #audit-log + #client-uploads if too noisy\n");
}

async function paginatedMembers(guildId) {
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

main().catch((e) => {
  console.error("\n❌ FAILED:", e.message);
  if (e.stack) console.error(e.stack.split("\n").slice(1, 4).join("\n"));
  process.exit(1);
});
