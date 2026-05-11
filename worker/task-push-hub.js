/**
 * TaskPushHub — Durable Object that brokers real-time WebSocket pushes from
 * the worker to one or more always-on laptops.
 *
 * Architecture:
 *   - One DO instance per laptop_id (idFromName(laptopId))
 *   - Laptops open `wss://shinel-auth.../admin/agency/laptop/ws?laptop_id=X`
 *   - Worker code calls `stub.fetch("https://do/notify", { POST })` whenever
 *     it inserts a new laptop_tasks row → DO broadcasts to all open sockets
 *   - Hibernation API used so DO can suspend between messages (Free-tier safe)
 *
 * Why this exists:
 *   Polling every 20 min has 20-min worst-case latency for user-initiated
 *   tasks (e.g. clicking "▶ Sync IG" in the cockpit). WebSocket push drops
 *   that to ~2 sec while the laptop SKILL is actively listening.
 *
 * Free tier costs:
 *   - DO storage: ~0 KB persistent (we only buffer recent messages)
 *   - Wall time: idle hibernated sockets ≈ 0 GB-s
 *   - Outbound: 1 small JSON per task enqueued (~100 bytes)
 */

const MAX_BUFFER = 50;         // keep last N messages for late-joiners
const BUFFER_TTL_MS = 60_000;  // buffer entries older than this are dropped

export class TaskPushHub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // Buffer of recent broadcasts so a freshly-connected laptop can catch
    // up on the last minute of pushes (if it WS-reconnects mid-task).
    this.buffer = [];
  }

  // -------------------------------------------------------------------------
  // HTTP-style entrypoint. Worker code calls this DO with normal `fetch()`,
  // and we dispatch by pathname.
  // -------------------------------------------------------------------------
  async fetch(request) {
    const url = new URL(request.url);

    // ---- /ws — upgrade to WebSocket
    if (url.pathname === "/ws") {
      const upgrade = request.headers.get("Upgrade");
      if (upgrade !== "websocket") {
        return new Response("Expected websocket upgrade", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Hibernation API — DO can hibernate between messages, drastically
      // reducing wall-time charges. The runtime calls webSocketMessage /
      // webSocketClose handlers when events arrive.
      const meta = {
        connected_at: Date.now(),
        laptop_id: url.searchParams.get("laptop_id") || "unknown",
        version: url.searchParams.get("version") || "?",
      };
      this.state.acceptWebSocket(server, [meta.laptop_id]);
      server.serializeAttachment(meta);

      // Send hello + drain recent buffer in case caller missed pushes
      const now = Date.now();
      const recent = this.buffer.filter((m) => now - m.ts < BUFFER_TTL_MS);
      server.send(JSON.stringify({
        type: "hello",
        ts: now,
        laptop_id: meta.laptop_id,
        buffered: recent.length,
      }));
      for (const m of recent) {
        try { server.send(JSON.stringify(m)); } catch {}
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    // ---- /notify — broadcast a message to all open sockets
    if (url.pathname === "/notify" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { body = {}; }
      const msg = {
        type: body.type || "task_available",
        task_id: body.task_id || null,
        task_type: body.task_type || null,
        client_id: body.client_id || null,
        priority: body.priority ?? null,
        source: body.source || null,
        ts: Date.now(),
      };

      // Trim buffer + push the new message
      const cutoff = msg.ts - BUFFER_TTL_MS;
      this.buffer = this.buffer.filter((m) => m.ts >= cutoff).slice(-MAX_BUFFER + 1);
      this.buffer.push(msg);

      const sockets = this.state.getWebSockets();
      let sent = 0;
      const payload = JSON.stringify(msg);
      for (const ws of sockets) {
        try { ws.send(payload); sent++; } catch {}
      }
      return Response.json({ ok: true, broadcast: sent, sockets: sockets.length });
    }

    // ---- /status — diagnostic
    if (url.pathname === "/status" && request.method === "GET") {
      const sockets = this.state.getWebSockets();
      const conns = sockets.map((ws) => {
        let meta = null;
        try { meta = ws.deserializeAttachment(); } catch {}
        return meta;
      });
      return Response.json({ ok: true, connections: sockets.length, conns, buffer_size: this.buffer.length });
    }

    // ---- /close-all — admin reset
    if (url.pathname === "/close-all" && request.method === "POST") {
      const sockets = this.state.getWebSockets();
      for (const ws of sockets) {
        try { ws.close(1000, "admin reset"); } catch {}
      }
      return Response.json({ ok: true, closed: sockets.length });
    }

    return new Response("not found", { status: 404 });
  }

  // -------------------------------------------------------------------------
  // Hibernation message handlers — runtime wakes the DO only when a client
  // sends bytes, then puts it back to sleep.
  // -------------------------------------------------------------------------
  async webSocketMessage(ws, message) {
    let parsed;
    try { parsed = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message)); }
    catch { parsed = { type: "noop" }; }

    if (parsed.type === "ping") {
      try { ws.send(JSON.stringify({ type: "pong", ts: Date.now() })); } catch {}
      return;
    }

    if (parsed.type === "ack") {
      // Optional: clients can ack a task push so we can prune buffer faster.
      // For now we just no-op — buffer auto-expires.
      return;
    }
  }

  async webSocketClose(ws, code, reason) {
    // Runtime auto-removes the socket from getWebSockets() after close
    try { ws.close(code, reason); } catch {}
  }

  async webSocketError(ws, err) {
    try { ws.close(1011, "error"); } catch {}
  }
}

/**
 * notifyLaptopPush — convenience helper. Send a push message to the DO
 * for a given laptop_id. Used from agency-handlers right after every
 * `INSERT INTO laptop_tasks` so the laptop wakes up instantly.
 *
 * Returns { ok, broadcast } or { ok:false, skipped } if DO binding missing.
 * Never throws — push is best-effort, polling is the safety net.
 */
export async function notifyLaptopPush(env, laptopId, message) {
  if (!env.TASK_PUSH_HUB) return { ok: false, skipped: "no DO binding" };
  try {
    const id = env.TASK_PUSH_HUB.idFromName(laptopId || "shinel-mainframe");
    const stub = env.TASK_PUSH_HUB.get(id);
    const res = await stub.fetch("https://do/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message || {}),
    });
    const j = await res.json().catch(() => ({}));
    return j;
  } catch (e) {
    console.error("[push] notify failed:", e.message);
    return { ok: false, error: String(e.message || e) };
  }
}
