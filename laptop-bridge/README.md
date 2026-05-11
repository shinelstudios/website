# Shinel Push Bridge

Always-on WebSocket bridge that listens for task pushes from the worker and writes a `trigger.txt` marker in your Cowork workspace so the `laptop-poll-queue` SKILL runs near-instantly.

## What problem this solves

The Cowork SKILL polls every 20 minutes. Cockpit clicks like **▶ Sync IG** wait up to 20 min before they execute. With this bridge running:

```
Cockpit click ──> Worker inserts laptop_tasks row ──> Worker pushes to DO
                                                            │
                                                            ▼
                                                Push-bridge receives push (~50ms)
                                                            │
                                                            ▼
                                                Writes trigger.txt in cache/
                                                            │
                                                            ▼
                                       Cowork `*/1 * * * *` task sees trigger
                                                            │
                                                            ▼
                                                Runs laptop-poll-queue SKILL
                                                            │
                                                            ▼
                                                Tasks execute (~5-10 sec total)
```

End-to-end latency: ~2 seconds instead of up to 20 minutes.

## Setup

```powershell
cd "C:\Users\ragha\Desktop\Claude Cowork\Shinel Studios\agency-platform\laptop-bridge"
npm install
```

Set env vars (use **System Environment Variables**, not just shell, so the auto-start picks them up):

```
SHINEL_WORKER_URL     = https://shinel-auth.shinelstudioofficial.workers.dev
SHINEL_LAPTOP_ID      = shinel-mainframe
SHINEL_LAPTOP_TOKEN   = <the LAPTOP_API_TOKEN secret value>
SHINEL_WORKSPACE_DIR  = C:\Users\<you>\Desktop\Claude Cowork\Shinel Studios\cache
```

Test it once:

```powershell
node push-bridge.js
```

You should see:

```
[bridge] starting { worker: ..., laptop_id: shinel-mainframe }
[bridge] connected { laptop_id: shinel-mainframe }
[bridge] hello { buffered: 0 }
```

In another window, fire a test push:

```powershell
curl -X POST "$env:SHINEL_WORKER_URL/admin/agency/laptop/enqueue" `
  -H "X-Laptop-Token: $env:SHINEL_LAPTOP_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"type":"test_ping","priority":9}'
```

The bridge should log:

```
[bridge] push { task_id: "uuid", type: "test_ping", client_id: null }
```

And `cache\trigger.txt` should contain one row.

## Make it auto-start on logon

**Option A — Task Scheduler (simplest):**
1. Open Task Scheduler → Create Task
2. General tab: name it `Shinel Push Bridge`, check "Run whether user is logged on or not", check "Hidden"
3. Triggers tab → New → "At log on" of your user
4. Actions tab → New → Action: `Start a program`
   - Program: `node`
   - Arguments: `"C:\Users\ragha\Desktop\Claude Cowork\Shinel Studios\agency-platform\laptop-bridge\push-bridge.js"`
   - Start in: `C:\Users\ragha\Desktop\Claude Cowork\Shinel Studios\agency-platform\laptop-bridge`
5. Conditions tab: uncheck "Start the task only if the computer is on AC power"
6. Settings tab: check "If the task fails, restart every 1 minute, attempt up to 999 times"

**Option B — NSSM (run as a real Windows service):**
1. Download NSSM (`nssm.exe`)
2. `nssm install ShinelPushBridge "C:\Program Files\nodejs\node.exe" "C:\path\to\push-bridge.js"`
3. Set the env vars in the NSSM "Environment" tab
4. `nssm start ShinelPushBridge`

## The matching Cowork scheduled task

Set up a 1-minute-interval Cowork task that runs `laptop-poll-queue` ONLY if `trigger.txt` exists:

In your Cowork `/schedule create` step, add a second schedule:

```
/schedule create laptop-poll-queue-push cron='*/1 * * * *' --condition=trigger-file
```

The SKILL itself should check for the trigger file before doing real work:

```
if not exists(WORKSPACE_DIR + "/trigger.txt"):
    exit with "[laptop-poll] no trigger · skip"

# Read trigger.txt for hints (task IDs that pushed), then claim + execute as normal.
delete trigger.txt
proceed with claim/execute flow
```

This makes idle ticks free (no claim call) while keeping push latency at ~2 s.

## Health check

```powershell
curl "$env:SHINEL_WORKER_URL/admin/agency/laptop/ws/status?laptop_id=shinel-mainframe" `
  -H "X-Laptop-Token: $env:SHINEL_LAPTOP_TOKEN"
```

Should return `{ ok: true, connections: 1, conns: [...] }` while the bridge is running.

## Logs

The bridge writes to `cache/push-bridge.log`. Rotate or delete periodically.
