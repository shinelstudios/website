# Shinel Studios — AI Agent Instructions

This file is the canonical context for Claude Code (and any other AI coding
agent). Read it before touching code. Keep it current — when you change a
convention, update this file in the same commit.

---

## What this codebase is

Shinel Studios is a post-production house for creators and brands (video
editing, GFX, thumbnails, graphic design, channel strategy). This repo is
the full website: marketing surface, admin panel, team-member portfolios,
free creator tools, Cloudflare Worker API.

Production URL: `https://shinelstudios.in`

## Architecture

```
frontend/              React 18 + Vite + Tailwind SPA
  src/design/          Redesign v2 design system — IMPORT FROM HERE, not ad-hoc
    motion.js          framer-motion presets (easeEditorial, stagger, viewportOnce)
    hooks/             useReducedMotion, useDeviceCapabilities, useInView
    ui/                Section, Kicker/Eyebrow/Display/Lede/Meta, HairlineCard,
                       RevealOnScroll, GrainOverlay, VideoFrame, MarqueeRow, Img
    animations/        ScrollAurora, ReadingProgress, SpotlightSweep, NumberTickIn
  src/components/      All React components — one page/feature per file
    home/              Homepage-only sections (EditorialHero, EditorialProcess…)
    pages/             AboutPage, FAQPage (thin route wrappers)
    blog/              Blog index + card + post
    tools/             Creator tools (ToolsIndex + each tool file)
    hub/               Authenticated dashboard surfaces
    c/                 Public per-client pages at /c/<slug> + 16 modules/
    clientportal/      Client self-edit surface at /clients/me + /edit + /inbox
  src/config/constants.js   Brand tokens, API bases, festival discounts
  src/utils/tokenStore.js   In-memory access token + refreshOnce() singleton

worker/                Cloudflare Worker (auth, API, D1/KV/R2 orchestration)
  worker.js            Single-file worker. Routes via if-chain on url.pathname.
  schema.sql           D1 schema. Append new tables here; run via wrangler d1 execute.
  wrangler.toml        Bindings: DB (shinel-db), KV namespaces, secrets

backend/               Legacy Node/Express server for the YouTube Captions tool.
                       Currently disabled; see commit bd3a08e for context.
                       Only re-enable behind CAPTIONS_API_URL env var.

.github/workflows/
  mirror.yml           GH Actions cron (*/5 * * *) mirrors pending videos to
                       YouTube via yt-dlp. Replaces the old persistent daemon.
```

## Deploy

- **Frontend**: Cloudflare Pages auto-builds on push to `main`. Build command
  `cd frontend && npm run build` → `frontend/dist/`. `_redirects` and `_headers`
  in `frontend/public/` drive SPA fallback and security headers.
- **Worker**: `cd worker && npx wrangler deploy`. Currently at version
  `233479df-4160-4829-a6cd-90f1371eef9e` (Phase 4 client portal).
- **D1 migrations**: `wrangler d1 execute shinel-db --remote --command "…"`.
  Running an ALTER twice errors with "duplicate column"; worker endpoints
  catch it gracefully.
- **Env vars / secrets**: `wrangler secret put NAME` for the worker;
  `frontend/.env` (gitignored) for build-time Vite vars.
- **YouTube API key lives ONLY in the worker** as `YOUTUBE_API_KEYS`
  (comma-separated pool, rotated by `getYoutubeKey()` at
  worker.js:486). Never re-add it to `frontend/.env` — every `VITE_*`
  var ships in the public bundle. Frontend always proxies YouTube
  calls through the worker.

## Redesign v2 — what's done (24 commits, Phase 1)

### Visual identity
All public URLs share one editorial hero pattern: **Kicker → Display XL
(with italic orange accent verb) → Lede → CTAs**. Applied to:

- `/` (EditorialHero replaces the old HeroSection + NetworkImpactBar)
- `/work`, `/about`, `/faq`, `/pricing`, `/graphic-design`, `/contact`
- `/video-editing`, `/branding`, `/shorts`, `/thumbnails`
- `/team`, `/team/:slug`, `/tools`, `/blog`
- `/privacy`, `/terms`, `/login`, `/live`, `/*` (404)

### Animations — the signature map

Each page gets ONE ambient animation, all obeying the perf contract
(transform + opacity only, IntersectionObserver-gated, paused when tab
hidden, <0.5ms/frame budget). Never add a second ambient animation to a
page without removing the first.

| Page | Signature |
|------|-----------|
| `/` home | ScrollAurora (scroll-drifting orange blob) |
| `/team` cards | Breathing orange hairlines (`.breathe-hairline`) |
| `/team/:slug` | Ken-Burns avatar + GrainOverlay |
| `/pricing`, `/work`, `/about` | NumberTickIn on stats |
| `/blog`, `/case-studies` | ReadingProgress bar |
| `/login` | SpotlightSweep (cursor-followed radial) |
| `/me`, `/dashboard/*` | None — interaction feedback only |
| Site-wide | GrainOverlay fixed layer |

### Team portfolios
- Worker endpoints: `GET /team`, `GET /profiles/:slug`, `PUT /profiles/me`,
  `PUT /profiles/me/work-visibility`.
- Frontend: `/team` directory, `/team/:slug` per-member microsite,
  `/me` self-serve editor (avatar upload, bio, socials, services, work
  visibility toggles).
- D1: `is_visible_on_personal` column on `inventory_videos` +
  `inventory_thumbnails` (run the ALTERs in `worker/schema.sql` once).

### Client portal — per-client public pages at /c/<slug>
The bio-link product. Each client (brand/creator we work with) gets a
public modular page they can put in their IG/YT bio. They self-edit it
through `/clients/me/edit` after the admin grants them portal access.

- **URL**: `/c/<slug>` — short, bio-friendly. Frontend SPA route +
  worker `/api/c/:slug` data endpoint. Slug regex: lowercase letters,
  digits, dashes; 3–30 chars; not in the reserved list (admin/api/c/
  dashboard/login/logout/me/studio/hub/blog/work/team/contact/pricing/
  tools/faq/about/live/privacy/terms/services/live-templates/portfolio/
  portal/settings/leaderboard).
- **Module registry** at
  `frontend/src/components/c/modules/index.js` — single source of truth.
  16 modules in 3 buckets:
  - **Core (5)**: Hero, BioLinks, LatestVideo, Stats30Day, TipJar
  - **Revenue / Phase 2 (7)**: SponsorRates, AffiliateShelf, MerchShelf,
    Calendly, CourseLinks, Newsletter, Contact
  - **Engagement / Phase 4 (4)**: PressKit (jsPDF lazy import),
    FanWall, AMA, DevLog
  - Plus forced **ShinelFooter** ("Hire my editor" CTA, mandatory
    on free tier).
  - Adding a new module: drop a `XxxModule.jsx` exporting
    `default { Render, Editor }`, add one entry to the registry, add
    one type to `CLIENT_MODULE_TYPES` + a `sanitizeModuleConfig` case
    in `worker/worker.js`. Zero schema changes.
- **Auth**: reuses existing `/auth/login` + `tokenStore`. New helper
  `requireClientOrThrow(request, secret, env)` checks role includes
  `"client"` or `"admin"`. Client→D1 link via `clients.portal_email`
  column matching the JWT email.
- **Worker endpoints**:
  - Public: `GET/POST /api/c/:slug/{,youtube/latest,stats/30day,
    sponsor,contact,newsletter,wall,ama,devlog}` — all rate-limited
    per-slug, honeypot-gated where POST.
  - Self-serve: `GET/PUT /portal/me`, `PUT /portal/me/modules`,
    `GET/PATCH /portal/me/inbox*`, `GET /portal/me/inbox/newsletter.csv`.
  - Admin: `POST/DELETE /admin/clients/:id/portal-access` (creates
    SHINEL_USERS KV row + sets `clients.portal_email`),
    `POST /admin/clients/:id/devlog` (Shinel team posts to a client's
    BTS timeline).
- **D1**: 12 columns on `clients` (slug, public_enabled, tier,
  tier_expires_at, display_name, tagline, avatar_url, banner_url,
  discord_webhook_url, modules_json, last_login_at, portal_email).
  New table `client_inbox` (id, client_id, type, payload_json,
  read_at, pinned_at, created_at). All four engagement modules
  (wall, ama, devLog) reuse `client_inbox` under different `type`
  values + `pinned_at` as the moderation/publish toggle.
- **Notifications**: per-client Discord webhook URL stored on the
  client row. Validated to discord.com hosts. Worker fire-and-forgets
  on every inbox row. No outbound email path.

### Self-hosted fonts
`@fontsource-variable/{outfit,inter,space-grotesk}` — no Google Fonts
DNS hop. Stacks prefer `"Outfit Variable" → "Outfit" → sans-serif`.

### SEO infrastructure
- `frontend/scripts/generate-sitemap.js` fetches `/team` at build time and
  emits every member's `/team/:slug` entry.
- `frontend/public/robots.txt` disallows `/admin/`, `/dashboard`,
  `/studio`, `/hub`, `/me`, `/login`, `/logout`; allows AI bots
  (GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, anthropic-ai, etc).

---

## Business policy (READ THIS — it's not just preference)

### Team pages are shareable, not browseable

`/team` and `/team/:slug` are **fully public and indexed in sitemap** —
but they MUST NOT appear in site nav, the homepage, or any marketing
surface a casual visitor browses. The tension: team pages help individual
editors grow their own audience (Instagram bio, resume, direct share);
the nav funnels paying customers to Shinel the agency. Those two goals
live together if and only if nobody browsing the site stumbles onto
`/team` while deciding whether to hire.

**If you're adding a "Meet the makers" strip, stop.** Read `git log -S
"Meet the makers"` and the business-protection section of the plan file
at `~/.claude/plans/plan-for-all-fixes-twinkling-comet.md`. The only
discovery paths are: direct URL / Google search / share link.

### Lead routing on `/team/:slug`

Current behavior: "Hire" button dials the editor's Calendly or WhatsApp
directly. Accepted trade-off today. If leads start bypassing Shinel's
admin queue in a way that costs agency margin, the plan to revisit is
"route through Shinel, tag with maker slug" — see
`PortfolioPage.jsx:socials` + `worker.js /leads` for the plumbing.

### Client portal pages: shareable, NEVER browseable

Same rule as `/team`, stricter: `/c/<slug>` is **public + sitemap-indexed**
but MUST NOT appear in site nav, the homepage, or any marketing
surface. Clients put their own URL in their IG/YT bio; that's the only
discovery path other than direct share/Google. There is no `/c` index
page and never should be — it would compete with `/team` and Shinel's
own funnel.

The Shinel "Hire my editor" footer is forced on every free-tier page
(`forced: true` on `MODULE_REGISTRY.shinelFooter`). That's the
monetisation handshake: free distribution for the client, lead gen
for Shinel. Don't make it removable except on a future paid Pro tier.

---

## Design system conventions

**Import from `@/design`, not ad-hoc Tailwind:**
```jsx
import { Section, Kicker, Display, Lede, HairlineCard, RevealOnScroll } from "../design";
```

**Every new marketing page follows this skeleton:**
```jsx
<Section size="lg" className="pt-24 md:pt-32">
  <RevealOnScroll><Kicker>Page kicker</Kicker></RevealOnScroll>
  <RevealOnScroll delay="80ms">
    <Display as="h1" size="xl">
      Headline with <span style={{ color: "var(--orange)" }}>orange accent.</span>
    </Display>
  </RevealOnScroll>
  <RevealOnScroll delay="160ms"><Lede>Positioning…</Lede></RevealOnScroll>
</Section>
```

**Animations MUST use the hooks:** `useReducedMotion()`,
`useDeviceCapabilities()` (isLowPower, isLowBattery, isMobile, saveData).
If either returns the "degrade" state, render a static frame.

**Colour: orange at `var(--orange)`.** Tokens live in
`frontend/src/index.css` @layer base. Hairline borders (`--hairline`)
replace heavy borders. Three surface depths: `--surface`, `--surface-alt`,
`--surface-elev`.

**Typography scale: `.text-display-{xl,lg,md,sm}`, `.text-kicker`,
`.text-eyebrow`, `.text-meta`, `.text-mono-num`.** Avoid hardcoded `text-5xl
font-black` — reach for these.

**Buttons: `.btn-editorial` (primary orange pill) or
`.btn-editorial-ghost` (outlined).** Not `.btn-brand` — that's legacy.

## Common commands

```bash
# Frontend dev
cd frontend && npm run dev             # Vite dev server

# Full build (runs sitemap + prerender)
cd frontend && npm run build

# Worker deploy
cd worker && npx wrangler deploy

# D1 migration
cd worker && npx wrangler d1 execute shinel-db --remote --command "…"

# Tail worker logs (debugging)
cd worker && npx wrangler tail

# Generate sitemap manually
cd frontend && node scripts/generate-sitemap.js
```

## Auth plumbing (read before touching any admin fetch)

- **Access token** lives in memory only (`frontend/src/utils/tokenStore.js`).
  Never write it to localStorage — XSS would exfiltrate it. Read it via
  `getAccessToken()` per-request, not once on mount.
- **Refresh token** lives in a cookie `ss_refresh` set by the worker with
  `HttpOnly; Secure; SameSite=None; Path=/; Max-Age=7d`. `SameSite=None` is
  **required** because the frontend (`shinelstudios.in`) and worker
  (`*.workers.dev`) are cross-site. Do NOT change it back to `Lax` — that
  silently logged users out on every reload until a fix in commit after
  `f70024e`. All Set-Cookie and Clear-Cookie paths (login, refresh rotation,
  refresh error, logout) must use `SameSite=None`.
- **Admin fetches**: prefer `authedFetch(apiBase, path, init)` from
  `tokenStore.js`. It attaches the Bearer token, retries once on 401 via the
  `refreshOnce()` singleton, and returns the response for the caller to
  handle. New admin code should default to this. Raw `fetch` with a stale
  closure-captured token is how we kept ending up with "Bearer null" bugs.
- **Bulk endpoints** take `{ ids: string[] }` in the body. Cap at 200 per
  call on the worker side. Cascade through `media_collection_items` before
  the main delete so orphan rows don't accumulate.

## Agent etiquette

- **Never touch `/team` nav discoverability** without re-reading the
  business policy above.
- **Never add a second ambient animation to a page.** One signature per
  page, enforced by convention not code.
- **Never skip the perf contract on animations.** transform + opacity only.
  No `width`/`height`/`top`/`left`/`filter` on hot paths. Test on a 4×
  CPU-throttled emulated device before shipping.
- **Prefer editing an existing page/component to creating a new one.** The
  design system was built once so every new page slots in.
- **Never animate fonts, colors via keyframes, or anything that triggers
  paint.** If you need a color transition, use `opacity` on a layered element.
- **When you add a page, update `frontend/scripts/generate-sitemap.js`**.
- **Never link `/c/<slug>` from nav or the homepage** — same rule as
  `/team`. Direct URL only. Forced ShinelFooter on free tier stays on.
- **Adding a client-portal module = one file + one registry entry +
  one server-side sanitizer case.** Don't invent new patterns —
  copy `HeroModule.jsx` or `BioLinksModule.jsx`.

---

## Phase 2 roadmap

Anchor: `// PHASE 2 · TODO` comments in code for findability. Audit +
execution plan archived at
`~/.claude/plans/plan-for-all-fixes-twinkling-comet.md`.

### Shipped

1. ✅ **Testimonials KV** — `app:testimonials:list` + worker
   GET/POST/PUT/DELETE `/api/testimonials` + `AdminTestimonialsPage`
   at `/dashboard/testimonials` + homepage "More praise" strip below
   the hardcoded rich carousel. Simple quote-style only; the rich
   video/analytics carousel stays hardcoded (commit `ad44abb`).
3a. ✅ **"Is my thumbnail clickable?"** — `/tools/thumbnail-clickability`.
   Client-side canvas analysis (luminance std-dev, brightness band,
   chroma, Sobel edge density, resolution, aspect ratio). Skipped
   face-api.js — 1.5MB dep not worth the marginal signal (commit
   `b808475`).
3b. ✅ **"Channel audit in 60s"** — `/tools/channel-audit`. Worker
   GET `/api/channel-audit?handle=…` pulls last 20 uploads (3 YT API
   units, rate-limited 5/15min per IP). Frontend scores cadence +
   title length + view consistency + thumbnail variety + engagement
   locally. Accepts @handle / UC… / full youtube URL.
3c. ✅ **"Content calendar starter"** — `/tools/content-calendar`.
   Pure frontend, template-driven. 5 niches × 8 hook archetypes.
   Copy-to-clipboard + CSV export.
9. ✅ **Web Vitals beacon** — `utils/webVitals.js` lazy-loads
   `web-vitals` v5, flushes single sendBeacon on visibilitychange/
   pagehide. Worker POST `/api/metrics/pageview` + GET
   `/api/metrics/summary`. Admin UI at `/dashboard/metrics` with
   1/7/30-day window, Google-banded p75 cards, per-day bar chart,
   per-path breakdown (commit `c1da404`).
13. ✅ **Client portal v1+2+4** — full bio-link product at
    `/c/<slug>`. 16 modules, self-edit at `/clients/me/edit`,
    moderation inbox at `/clients/me/inbox`, admin grants portal
    access from `/dashboard/clients`. See "Client portal" section
    above for endpoints/schema/policy. Commits `186df25` (v1
    foundation), `1d5e018` (lazy-migrate fix), `3d6b98c` (Phase 2:
    7 revenue modules + KV→D1 backfill), `5ba2ec9` (Phase 4: 4
    engagement modules + pin/answer inbox). Deferred forever
    (per user): Razorpay billing / Pro tier, Resend email, R2
    upload, custom domains, self-serve password reset.

### Not started

2. **Case studies system** — new D1 table `case_studies` (slug PK,
   cover, brief, role_list, tools, metrics_json, gallery_json,
   body_md, published, attributed_slugs_json). New `/case-studies` +
   `/case-studies/:slug` pages. Admin editor mirroring
   `AdminBlogEditor.jsx`. Each team `/team/:slug` profile links out
   to the case studies they contributed to.
4. **OG image generator** — Satori at build time, emit per-page
   1200×630 PNG to `frontend/public/og/`, reference from MetaTags.
5. **Pre-rendering (broader)** — vite-plugin-prerender already runs
   on many routes; extend to `/tools/*`, `/case-studies/*`,
   team pages.
6. **Admin dashboard refresh** — command palette (`cmdk`), leads
   funnel chart, team-member activity heatmap.
7. **Image build step** — auto WebP conversion of portfolio JPGs at
   build (script → `frontend/scripts/images-to-webp.js`). Use `Img`
   primitive's `webp` prop.
8. **Playwright smoke suite** — Chromium + WebKit + Firefox, run in
   GH Actions on every PR.
10. **Full homepage section rewrites** — TestimonialsSection,
    ServicesSection grid, ServiceLens, AI Tools CTA band. Each works
    but uses pre-redesign type/spacing.
11. **SiteHeader deep refactor** — 1200+ lines, legacy architecture.
    Risky.
12. **Retire `/live-templates`** OR refresh its 1808-line page.

### Out of scope (do NOT do without explicit ask)
- Paid CMS (Sanity, Contentful) — D1 + KV is enough.
- A/B testing framework — premature until traffic warrants.
- Multilingual — English-only.
- PWA install prompt — `sw-thumbnails.js` exists; don't promote to full
  PWA until analytics show repeat visits.
- Rotating the leaked Discord webhook secret — separate op task, not code.

---

## Historical notes (so future-you doesn't redo them)

- The `/profiles/:slug` endpoint used to return 500 on unknown slugs;
  fixed in `0fc1bbd`. Returns 404 now. Any throws in the KV scan loop
  are caught per-record so one bad KV entry doesn't poison the whole scan.
- `/clients/history` similarly: allSettled over per-key JSON parse so one
  malformed record doesn't 500 the whole endpoint.
- `/portfolio/{service-slug}` used to show "PROFILE NOT FOUND" because
  the team-member route caught them; fixed by explicit redirects in
  App.jsx for graphic-design, video-editing, branding, thumbnails, shorts.
- Heroes on service pages (VideoEditing, Branding, Shorts, Thumbnails,
  GraphicDesign) all use the same editorial skeleton — copy from one if
  you add a new service.
- `/services` root redirects to `/work` — per user policy, Work is the
  single browse surface; there is no "services" landing page.
- The legacy `/clients` worker endpoint dual-writes to KV
  (`app:clients:registry`) AND D1 `clients` table, but D1 inserts
  silently failed for years — the table was empty while all 14 clients
  lived only in KV. `getClients()` returns D1 if non-empty, KV as
  fallback. Lazy-migrating just one client into D1 (for portal
  access) caused the other 13 to vanish from `/dashboard/clients`
  because the fallback stopped firing. Fixed by `worker/scripts/
  backfill-clients-to-d1.mjs` (one-shot INSERT OR IGNORE for all 14)
  in commit `3d6b98c`. D1 is now source of truth; KV stays in sync
  via dual-write on POST/PUT/DELETE. If you ever see clients
  disappear from the Pulse Registry, the prime suspect is D1↔KV drift
  again — re-run that backfill script.
- `/admin/clients/:id/portal-access` includes a lazy KV→D1 fallback
  (commit `1d5e018`). If a client is in KV but not D1, the worker
  copies the row over from KV before creating the portal user. Safety
  net for any KV-only clients added in the future, though the
  backfill above means this branch should rarely fire.

Last updated: 2026-04-27 — Client Portal v1 → Phase 4 delivery
session. Commits `186df25` (v1 foundation: 6 core modules + auth +
admin), `1d5e018` (KV→D1 lazy-migrate), `3d6b98c` (Phase 2: 7 revenue
modules + full KV backfill), `5ba2ec9` (Phase 4: PressKit + FanWall +
AMA + DevLog + inbox moderation). 16 modules total. Worker version
`233479df`.
