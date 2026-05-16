#!/usr/bin/env node
/**
 * add-editor-types.mjs — adds compensation-tier + skill-tier roles, plus a
 * #freelancers-only channel in INTERNAL HQ scoped to freelancers.
 *
 * Idempotent.
 */

import { readFileSync } from "node:fs";

const GUILD_ID = process.argv[2] || "1298972908193972255";
const TOKEN = readFileSync(".discord-bot-token", "utf8").trim().replace(/^["']|["']$/g, "");
const API = "https://discord.com/api/v10";
const HEADERS = {
  Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json",
  "User-Agent": "ShinelCockpitBot/1.0",
};

const TYPE = { TEXT: 0, CATEGORY: 4 };
const PERM = {
  VIEW_CHANNEL:         1n << 10n,
  SEND_MESSAGES:        1n << 11n,
  ADD_REACTIONS:        1n << 6n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  ATTACH_FILES:         1n << 15n,
  EMBED_LINKS:          1n << 14n,
};
const ALL = String(
  PERM.VIEW_CHANNEL | PERM.SEND_MESSAGES | PERM.ADD_REACTIONS |
  PERM.READ_MESSAGE_HISTORY | PERM.ATTACH_FILES | PERM.EMBED_LINKS
);

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${t.slice(0, 240)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const NEW_ROLES = [
  // Compensation tier (one per person)
  { name: "💼 Salaried Team",   color: 0x16a085, hoist: true,  mentionable: true,  cat: "comp" },
  { name: "💸 Freelance Editor", color: 0xf1c40f, hoist: true,  mentionable: true,  cat: "comp" },
  { name: "🎓 Intern",           color: 0x9b59b6, hoist: true,  mentionable: true,  cat: "comp" },
  // Skill tier (zero or more per person)
  { name: "🎬 Video Editor",     color: 0xe74c3c, hoist: false, mentionable: true,  cat: "skill" },
  { name: "🎨 GFX Artist",       color: 0xe91e63, hoist: false, mentionable: true,  cat: "skill" },
  { name: "📺 Live Producer",    color: 0x1abc9c, hoist: false, mentionable: true,  cat: "skill" },
];

async function main() {
  console.log("\n👥 Adding editor compensation + skill roles…\n");

  const [channels, roles] = await Promise.all([
    api("GET", `/guilds/${GUILD_ID}/channels`),
    api("GET", `/guilds/${GUILD_ID}/roles`),
  ]);

  const findRole = (name) => roles.find((r) => r.name === name);

  // ---- Phase 1 — create roles
  for (const r of NEW_ROLES) {
    if (findRole(r.name)) {
      console.log(`  ✓ role exists: ${r.name}`);
      continue;
    }
    console.log(`  + role: ${r.name}`);
    const created = await api("POST", `/guilds/${GUILD_ID}/roles`, {
      name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, permissions: "0",
    });
    roles.push(created);
  }

  // ---- Phase 2 — create gated channels in INTERNAL HQ
  // #freelancers-only  → 💸 Freelance Editor + Admin/Manager (salaried can't see)
  // #salaried-only     → 💼 Salaried Team + 🎓 Intern + Admin/Manager (freelancers can't see)
  // (#team-chat already exists in INTERNAL HQ — that's the common channel for everyone)
  const internalCat = channels.find((c) => c.type === TYPE.CATEGORY && c.name === "🏢 INTERNAL HQ");
  if (!internalCat) {
    console.log(`\n⚠ 🏢 INTERNAL HQ category not found — skipping channel creation`);
  } else {
    const everyoneId = GUILD_ID;
    const adminRole    = findRole("Admin");
    const managerRole  = findRole("Manager");
    const freelanceRole = findRole("💸 Freelance Editor");
    const salariedRole  = findRole("💼 Salaried Team");
    const internRole    = findRole("🎓 Intern");

    const GATED = [
      {
        name: "freelancers-only",
        topic: "💸 Freelance editors only — invoicing, briefs, pay schedule. Salaried staff don't see this.",
        roles: [freelanceRole].filter(Boolean),
      },
      {
        name: "salaried-only",
        topic: "💼 Salaried + 🎓 interns only — internal team comms, performance reviews, planning. Freelancers don't see this.",
        roles: [salariedRole, internRole].filter(Boolean),
      },
    ];

    for (const ch of GATED) {
      const overwrites = [
        { id: everyoneId, type: 0, allow: "0", deny: String(PERM.VIEW_CHANNEL) },
        ...(adminRole   ? [{ id: adminRole.id,   type: 0, allow: ALL, deny: "0" }] : []),
        ...(managerRole ? [{ id: managerRole.id, type: 0, allow: ALL, deny: "0" }] : []),
        ...ch.roles.map((r) => ({ id: r.id, type: 0, allow: ALL, deny: "0" })),
      ];

      const existing = channels.find(
        (c) => c.type === TYPE.TEXT && c.name === ch.name && c.parent_id === internalCat.id
      );
      if (!existing) {
        console.log(`\n  + #${ch.name} (in 🏢 INTERNAL HQ)`);
        await api("POST", `/guilds/${GUILD_ID}/channels`, {
          name: ch.name,
          type: TYPE.TEXT,
          parent_id: internalCat.id,
          topic: ch.topic,
          permission_overwrites: overwrites,
        });
      } else {
        console.log(`\n  ✓ #${ch.name} exists — refreshing perms`);
        await api("PATCH", `/channels/${existing.id}`, {
          permission_overwrites: overwrites,
          lock_permissions: false,
        });
      }
    }
  }

  console.log("\n✅ Done.");
  console.log("\nThree internal channels for team comms:");
  console.log("  #team-chat        → everyone in Team (common)");
  console.log("  #salaried-only    → 💼 Salaried + 🎓 Intern + Admin/Manager (freelancers can't see)");
  console.log("  #freelancers-only → 💸 Freelance + Admin/Manager (salaried can't see)");
  console.log("\nNow in Discord — right-click each member → Roles → tick the right tiers, e.g.:");
  console.log("  Suyash  → Team + Editor · Suyash + 💼 Salaried Team + 🎬 Video Editor");
  console.log("  Manan   → Team + Editor · Manan  + 💼 Salaried Team + 📺 Live Producer");
  console.log("  DK      → Team + Editor · DK     + 💼 Salaried Team + 🎨 GFX Artist");
  console.log("  Freelancer → Team + Editor · <Name> + 💸 Freelance Editor + skill role");
  console.log();
}

main().catch((e) => { console.error("\n❌", e.message); process.exit(1); });
