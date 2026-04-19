# Deploying the Node backend to Fly.io

The backend has **two processes** that share one Docker image:
- `web` — `server.js`, the YouTube captions API (called by the Worker)
- `mirror` — `mirror-service.js`, a daemon that polls D1 every 60s and archives videos

Fly.io is the recommended host because it supports `yt-dlp` subprocess spawning, long-running daemons, and fits the free allowance at this scale.

## One-time setup

```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh
#    then: export PATH="$HOME/.fly/bin:$PATH"

# 2. Sign up / sign in
fly auth signup     # or: fly auth login

# 3. From the backend/ directory, create the app (don't let it overwrite fly.toml)
cd backend
fly launch --copy-config --no-deploy --name shinel-backend
```

## Push secrets (same values as in backend/.env, never commit them)

```bash
fly secrets set \
  YT_CLIENT_ID="825863104465-...apps.googleusercontent.com" \
  YT_CLIENT_SECRET="GOCSPX-..." \
  YT_REDIRECT_URI="http://localhost:3000" \
  YT_REFRESH_TOKEN="1//0g..." \
  CLOUDFLARE_ACCOUNT_ID="ef97dba03debca21252fabdfee85d006" \
  CLOUDFLARE_API_TOKEN="cfut_..." \
  D1_DATABASE_ID="907df36d-0254-4744-8473-bcfcc4aa8e0c" \
  ALLOWED_ORIGIN="https://shinel-auth.shinelstudioofficial.workers.dev" \
  CAPTIONS_SHARED_SECRET="0bf81050c98aef11b845a2e17f4fb032f5bf77372d319b23f79add09ea940116b0a367af8c6d9b9cd51f576c5d731b9e"
```

## Deploy

```bash
fly deploy
```

Fly builds the Dockerfile (Node 20 + yt-dlp + ffmpeg), provisions one VM per process, and routes `https://shinel-backend.fly.dev` to the `web` process.

## Point the Worker at the new backend

```bash
cd ../worker
echo "https://shinel-backend.fly.dev" | npx wrangler secret put CAPTIONS_API_URL
npx wrangler deploy
```

## Verify

```bash
# Health check:
curl https://shinel-backend.fly.dev/
#   → ok

# Auth enforcement (should be 401):
curl -X POST https://shinel-backend.fly.dev/api/youtube-captions \
     -H "content-type: application/json" -d '{}'

# Logs (combined across processes):
fly logs
```

## Ops

| Action | Command |
|--------|---------|
| Tail logs for one process | `fly logs -i web` or `fly logs -i mirror` |
| SSH into a machine | `fly ssh console -s` (pick process group) |
| Scale memory | `fly scale memory 512 --process-group mirror` |
| Stop web between uses | Already configured: `auto_stop_machines = "stop"` |

## Cost

All-in this fits the free Fly allowance (3× shared-cpu-1x/256MB). If you outgrow it, expect ~$2–4/mo for the mirror VM alone.
