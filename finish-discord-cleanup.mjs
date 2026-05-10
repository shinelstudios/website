#!/usr/bin/env node
/**
 * finish-discord-cleanup.mjs — handles the only thing the main restructure
 * couldn't: the "Safety Alerts Channel" pin on #team-alerts.
 *
 * 1. Reassigns Discord's Safety Alerts Channel from #team-alerts → #security-logs
 *    (so AutoMod / Community Server alerts keep arriving in a sensible place)
 * 2. Deletes the now-orphan #team-alerts text channel
 * 3. Deletes the now-empty TEAM SHINEL category
 *
 * Idempotent. Safe to re-run.
 */

import { readFileSync } from "node:fs";

const GUILD_ID = process.argv[2] || "1298972908193972255";
const TOKEN = readFileSync(".discord-bot-token", "utf8").trim().replace(/^["']|["']$/g, "");
const API = "https://discord.com/api/v10";
const HEADERS = {
  Authorization: `Bot ${TOKEN}`,
  "Content-Type": "application/json",
  "User-Agent": "ShinelCockpitBot/1.0",
};

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

const TEAM_ALERTS_ID = "1301923375484108851";
const TEAM_SHINEL_CAT_ID = "1301923274942316585";

async function main() {
  console.log("🔧 Finish Discord cleanup\n");

  const [guild, channels] = await Promise.all([
    api("GET", `/guilds/${GUILD_ID}`),
    api("GET", `/guilds/${GUILD_ID}/channels`),
  ]);

  // Pick the new Safety Alerts target — prefer #🍖┃security-logs, fall back to #🍖┃all-logs
  const securityLogs = channels.find((c) => c.name === "🍖┃security-logs");
  const allLogs = channels.find((c) => c.name === "🍖┃all-logs");
  const target = securityLogs || allLogs;

  if (!target) {
    console.log("⚠ Couldn't find a logs channel to redirect Safety Alerts to.");
    console.log("  Manual fix: Server Settings → Safety Setup → Safety Alerts Channel → pick one yourself.");
    process.exit(1);
  }

  console.log(`Current pinned channels:`);
  console.log(`  rules_channel_id          = ${guild.rules_channel_id || "none"}`);
  console.log(`  public_updates_channel_id = ${guild.public_updates_channel_id || "none"}`);
  console.log(`  safety_alerts_channel_id  = ${guild.safety_alerts_channel_id || "none"}`);
  console.log(`Target for safety+updates: #${target.name} (id=${target.id})\n`);

  // ---- 1. Reassign all three Community-server pinned channels away from team-alerts
  // For Community servers, rules_channel_id / public_updates_channel_id are
  // REQUIRED — Discord blocks deletion of whichever channel they point to.
  // Reassign all three to safe destinations.
  const rulesChan = channels.find((c) => c.name === "🧃┃server-rules");
  const updates = {};
  if (guild.safety_alerts_channel_id === TEAM_ALERTS_ID) updates.safety_alerts_channel_id = target.id;
  if (guild.public_updates_channel_id === TEAM_ALERTS_ID) updates.public_updates_channel_id = target.id;
  if (guild.rules_channel_id === TEAM_ALERTS_ID && rulesChan) updates.rules_channel_id = rulesChan.id;
  // Always make sure rules points to server-rules if it's set anywhere weird
  if (rulesChan && guild.rules_channel_id !== rulesChan.id) updates.rules_channel_id = rulesChan.id;

  if (Object.keys(updates).length > 0) {
    console.log("↻ Reassigning pinned Community channels…");
    for (const [k, v] of Object.entries(updates)) console.log(`    ${k} → ${v}`);
    try {
      await api("PATCH", `/guilds/${GUILD_ID}`, updates);
      console.log("  ✓ done\n");
    } catch (e) {
      console.log(`  ✗ Reassignment failed: ${e.message}`);
      console.log("  Manual fix: Server Settings → Community → Server Settings → set Updates Channel to #all-logs or #security-logs\n");
    }
  } else {
    console.log("✓ Pinned channels already pointed elsewhere\n");
  }

  // ---- 2. Delete #team-alerts
  const teamAlerts = channels.find((c) => c.id === TEAM_ALERTS_ID);
  if (teamAlerts) {
    console.log(`✗ Deleting #${teamAlerts.name} (id=${TEAM_ALERTS_ID})`);
    try {
      await api("DELETE", `/channels/${TEAM_ALERTS_ID}`);
      console.log("  ✓ deleted\n");
    } catch (e) {
      console.log(`  ✗ ${e.message}\n`);
      console.log("  If still says 'required for community servers', the safety alert reassign hasn't taken effect.");
      console.log("  Wait 30s and re-run, OR fix manually in Server Settings.\n");
    }
  } else {
    console.log("· #team-alerts already gone\n");
  }

  // ---- 3. Delete TEAM SHINEL category if empty
  const cat = channels.find((c) => c.id === TEAM_SHINEL_CAT_ID && c.type === 4);
  if (cat) {
    const stillChildren = channels.filter((c) => c.parent_id === TEAM_SHINEL_CAT_ID).length - (teamAlerts ? 1 : 0);
    if (stillChildren > 0) {
      console.log(`· "${cat.name}" still has ${stillChildren} child channel(s) — leaving it alone.`);
      const kids = channels.filter((c) => c.parent_id === TEAM_SHINEL_CAT_ID);
      for (const k of kids) console.log(`     - #${k.name} (id=${k.id})`);
    } else {
      console.log(`✗ Deleting category "${cat.name}"`);
      try {
        await api("DELETE", `/channels/${TEAM_SHINEL_CAT_ID}`);
        console.log("  ✓ deleted");
      } catch (e) {
        console.log(`  ✗ ${e.message}`);
      }
    }
  } else {
    console.log("· TEAM SHINEL category already gone");
  }

  // ---- 4. Rename INTERNAL HQ's #announcements → #team-announcements to disambiguate
  // (there's a public #📌┃announcements for fans + an internal one for the team)
  const internalCat = channels.find((c) => c.type === 4 && c.name === "🏢 INTERNAL HQ");
  if (internalCat) {
    const internalAnnounce = channels.find(
      (c) => c.parent_id === internalCat.id && c.name === "announcements"
    );
    if (internalAnnounce) {
      console.log(`\n↻ Renaming internal #announcements → #team-announcements (disambiguate from public)`);
      try {
        await api("PATCH", `/channels/${internalAnnounce.id}`, { name: "team-announcements" });
        console.log("  ✓ renamed");
      } catch (e) {
        console.log(`  ✗ ${e.message}`);
      }
    }
  }

  console.log("\n✅ Done.");
}

main().catch((e) => {
  console.error("\n❌ FAILED:", e.message);
  process.exit(1);
});
