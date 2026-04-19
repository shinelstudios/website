# Deploying `server.js` to Koyeb (free, no card)

The Cloudflare Worker proxies `/api/youtube-captions` to this backend. Koyeb
is the cheapest card-less option that supports yt-dlp subprocess spawning
without sleeping.

## Why Koyeb

| | Koyeb free | Render free | Fly free | Railway |
|---|---|---|---|---|
| Card required? | **No** | No | Yes | Yes |
| Sleeps after idle? | **No** | Yes (15 min) | No | No |
| Supports yt-dlp subprocess | **Yes** | Yes | Yes | Yes |
| Build from GitHub | **Yes** | Yes | Yes | Yes |

## Click-through setup (once)

1. **Sign up** at https://app.koyeb.com/auth/signup — GitHub SSO is easiest.
2. **Create App** → "Deploy from GitHub" → pick `shinelstudios/website`.
3. **Service configuration**:
   - **Service type**: Web Service
   - **Branch**: `main`
   - **Builder**: Dockerfile
   - **Dockerfile location**: `backend/Dockerfile`
   - **Work directory**: `backend`
   - **Build context**: `backend`
   - **Instance type**: **Free (nano — 0.1 vCPU, 512 MB)**
   - **Region**: closest to your users (Frankfurt for EU, Washington for US, Singapore for Asia)
4. **Ports**: `8000` / HTTP / public.
5. **Health checks**: HTTP `GET /` on port 8000 (server.js exposes a 200-OK "ok" reply there).
6. **Environment variables** — add:

   | Name | Value |
   |------|-------|
   | `PORT` | `8000` |
   | `ALLOWED_ORIGIN` | `https://shinel-auth.shinelstudioofficial.workers.dev` |
   | `CAPTIONS_SHARED_SECRET` | *(copy from `backend/.env`)* |
   | `YT_CLIENT_ID` | *(copy from `backend/.env` — only needed if captions ever auth against YT; harmless to set)* |

   yt-dlp doesn't need YouTube OAuth credentials for captions — those are only for the mirror service, which runs on GitHub Actions.

7. **Deploy**. First build takes ~3 min (Node + apt + yt-dlp download).
8. Koyeb gives you a URL like `https://<service-name>-<org>.koyeb.app`. Copy it.

## Wire the Worker

Tell Claude the Koyeb URL. Claude will run:

```bash
cd worker
echo "https://<service-name>-<org>.koyeb.app" | npx wrangler secret put CAPTIONS_API_URL
npx wrangler deploy
```

(or do it yourself if preferred.)

## Verify

```bash
# Should say "ok"
curl https://<service-name>-<org>.koyeb.app/

# Should be 401 (missing shared secret) — proves auth middleware is on
curl -X POST https://<service-name>-<org>.koyeb.app/api/youtube-captions \
     -H "content-type: application/json" -d '{}'

# End-to-end through the Worker (replace <vid>)
curl -X POST https://shinel-auth.shinelstudioofficial.workers.dev/api/youtube-captions \
     -H "content-type: application/json" \
     -d '{"url":"https://www.youtube.com/watch?v=<vid>","lang":"en"}'
```

## Updates

Any push to `main` triggers an automatic Koyeb rebuild — same pattern as Cloudflare Pages. No manual redeploys needed.

## Free-tier limits

- 512 MB RAM, 0.1 vCPU — enough for caption extraction (yt-dlp peaks ~200 MB).
- 100 GB egress/month — enormous for our volume.
- 1 free service per account. If you add more, Koyeb requires a card, but the captions service alone is free forever.
