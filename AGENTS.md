# AI Agent Instructions

This project uses [`CLAUDE.md`](./CLAUDE.md) as the canonical source of
AI-coding-agent context. Read it first.

## Quick links inside CLAUDE.md

- **Architecture** — what frontend/worker/backend do and where things live
- **Business policy** — `/team` pages hide from nav but stay indexed;
  lead routing; read this before touching discoverability
- **Design system** — `@/design` conventions, import rules, forbidden
  patterns (no 2nd ambient animation per page, no paint-triggering CSS
  animations)
- **Common commands** — build, deploy, D1 migration, wrangler tail
- **Phase 2 roadmap** — what's intentionally not yet started, ordered by
  value, with anchors in code

## Finding Phase 2 TODOs in code

```bash
grep -rn "PHASE 2" frontend worker --include="*.{js,jsx,ts,tsx}"
```

Those comments mark intentional stubs / expected expansion points.

## Pointers for other AI tools

If you're GitHub Copilot, Cursor, Windsurf, or a custom agent — the same
rules in `CLAUDE.md` apply. Key ones in one page:

1. **Import from `../design`, not ad-hoc Tailwind** for Kicker, Display,
   HairlineCard, Section, RevealOnScroll, etc.
2. **Every marketing page uses the same hero skeleton**: Kicker →
   Display XL (with italic orange accent) → Lede → CTAs. Copy from
   `GraphicDesignPage.jsx` or `AboutPage.jsx`.
3. **Team pages stay out of nav**. Don't add "Meet the makers"
   strips, header links, or footer links pointing to `/team`.
4. **Animations are transform + opacity only**. Never animate
   `width`/`height`/`top`/`left`/`filter` on hot paths. Wrap ambients in
   `useReducedMotion()` + `useDeviceCapabilities()` gates.
5. **Orange is `var(--orange)` (`#E85002`)**. Hairline borders
   `var(--hairline)` replace heavy borders.
6. **Sitemap auto-fetches `/team` members at build time** —
   `frontend/scripts/generate-sitemap.js`. Add any new public page to
   the `pages` array there.
7. **Deploy**: frontend = push to `main` (CF Pages auto), worker =
   `cd worker && npx wrangler deploy`, D1 = `wrangler d1 execute …`.

Keep `CLAUDE.md` current. If you change a convention, update it in the
same commit.
