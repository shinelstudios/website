#!/usr/bin/env node
/**
 * push-bridge.js — Always-on WebSocket bridge for the Shinel always-on laptop.
 *
 * What it does
 * ------------
 * - Connects to wss://shinel-auth.../admin/agency/laptop/ws and keeps it open
 * - On `task_available` push, writes a `trigger.txt` marker in the Cowork
 *   workspace folder (with the task_type so the SKILL can claim by priority)
 * - Auto-reconnects with exponential backoff on disconnects
 * - Sends a `ping` every 30 s to keep middleboxes from killing the socket
 *
 * Pair it with a Cowork scheduled task `*/1 * * * *` that runs the
 * laptop-poll-queue SKILL only when `trigger.txt` exists, then deletes it.
 * That gives you ~2-sec end-to-end latency for cockpit clicks without
 * burning Claude tokens on idle wake-ups.
 *
 * Setup (Windows, runs as a logon scheduled task or via NSSM as a service):
 *
 *   npm install ws
 *   set SHINEL_LAPTOP_TOKEN=<your token>
 *   set SHINEL_WORKSPACE_DIR=C:\Users\<you>\Desktop\Claude Cowork\Shinel Studios\cache
 *   node push-bridge.js
 *
 * Setup (one-time, persistent):
 *   - Task Scheduler → Create task → Triggers: "At log on"
 *   - Action: `node C:\path\to\push-bridge.js`
 *   - Conditions: "Wake the computer to run this task" (optional)
 *   - Run whether user is logged on or not
 *
 * Or use NSSM (Non-Sucking Service Manager) to install as a Windows service.
 */

"use strict";

const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const os = require("os");

const WORKER_URL = process.env.SHINEL_WORKER_URL || "https://shinel-auth.shinelstudioofficial.workers.dev";
const LAPTOP_ID  = process.env.SHINEL_LAPTOP_ID  || "shinel-mainframe";
const TOKEN      = process.env.SHINEL_LAPTOP_TOKEN || "";
const WORKSPACE_DIR = process.env.SHINEL_WORKSPACE_DIR || path.join(os.homedir(), "Desktop", "Claude Cowork", "Shinel Studios", "cache");
const VERSION   = "1.3";

if (!TOKEN) {
  console.error("[bridge] FATAL: SHINEL_LAPTOP_TOKEN env var not set.");
  process.exit(2);
}

// Ensure workspace dir exists
try { fs.mkdirSync(WORKSPACE_DIR, { recursive: true }); } catch {}

const TRIGGER_PATH = path.join(WORKSPACE_DIR, "trigger.txt");
const LOG_PATH = path.join(WORKSPACE_DIR, "push-bridge.log");

function log(...args) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ")}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(LOG_PATH, line); } catch {}
}

// Single-instance lock (so two bridges can't fight over the same socket)
const LOCK_PATH = path.join(WORKSPACE_DIR, "push-bridge.lock");
try {
  if (fs.existsSync(LOCK_PATH)) {
    const pid = parseInt(fs.readFileSync(LOCK_PATH, "utf8"), 10);
    try { process.kill(pid, 0); log("Another bridge instance running pid", pid, "— exiting."); process.exit(1); }
    catch { /* stale lock */ }
  }
  fs.writeFileSync(LOCK_PATH, String(process.pid));
  process.on("exit", () => { try { fs.unlinkSync(LOCK_PATH); } catch {} });
  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));
} catch (e) { log("[bridge] lock check failed:", e.message); }

let backoff = 1000;
let pingTimer = null;
let lastPushAt = 0;

function connect() {
  const wsUrl = new URL("/admin/agency/laptop/ws", WORKER_URL.replace(/^http/, "ws"));
  wsUrl.searchParams.set("laptop_id", LAPTOP_ID);
  wsUrl.searchParams.set("token", TOKEN);
  wsUrl.searchParams.set("version", VERSION);

  const ws = new WebSocket(wsUrl.toString(), {
    headers: { "X-Laptop-Token": TOKEN }, // belt + suspenders auth
  });

  ws.on("open", () => {
    log("[bridge] connected", { laptop_id: LAPTOP_ID });
    backoff = 1000;
    // ping every 30s
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      try { ws.send(JSON.stringify({ type: "ping", ts: Date.now() })); } catch {}
    }, 30_000);
  });

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { log("[bridge] non-JSON msg:", raw.toString().slice(0, 80)); return; }

    if (msg.type === "hello") {
      log("[bridge] hello", { buffered: msg.buffered });
      return;
    }
    if (msg.type === "pong") return;

    if (msg.type === "task_available") {
      lastPushAt = Date.now();
      const line = `${new Date().toISOString()}\t${msg.task_id || ""}\t${msg.task_type || ""}\t${msg.client_id || ""}\t${msg.priority ?? ""}\t${msg.source || ""}\n`;
      try { fs.appendFileSync(TRIGGER_PATH, line); } catch (e) { log("[bridge] trigger write failed:", e.message); }
      log("[bridge] push", { task_id: msg.task_id, type: msg.task_type, client_id: msg.client_id });
      return;
    }

    log("[bridge] unknown msg type:", msg.type);
  });

  ws.on("close", (code, reason) => {
    log("[bridge] closed", { code, reason: String(reason || "") });
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 60_000); // cap at 60s
  });

  ws.on("error", (e) => {
    log("[bridge] error:", e.message);
    try { ws.close(); } catch {}
  });
}

log("[bridge] starting", { worker: WORKER_URL, laptop_id: LAPTOP_ID });
connect();
