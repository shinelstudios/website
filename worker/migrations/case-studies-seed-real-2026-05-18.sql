-- case-studies-seed-real-2026-05-18.sql
--
-- Replace the placeholder case-study rows seeded by case-studies-2026-05-18.sql
-- with the 3 real Shinel Studios stories the founder wants on the homepage:
--
--   1. AiSH is Live — channel cleanup & remonetization after a hater-driven
--      fake-watch-hours + superchat-refund-abuse attack that triggered
--      demonetization. Shinel got the channel monetized again in 9 days by
--      leveling up content quality (good original content), tightening SEO
--      discipline, and refusing to recycle or repeat content.
--
--   2. Kundan Parashar — end-of-2024 takeover of a devotional Hindu channel.
--      We rebuilt the SEO + thumbnail system, ran a tested-then-scaled
--      posting cadence, and shipped story-driven cuts that matched the
--      devotional audience's attention curve. One cycle of consistent
--      shipping: 10K+ subscribers and ~250K total views.
--
--   3. AP Sports Arena — brand-new sports/cricket Instagram page launched
--      mid-2025. Hook-first reel edits matched to live sports-trend timing,
--      sports-vernacular captions, frame-perfect vertical crops, audio sync
--      on cricket moments. Each reel averages 10K+ views; some 50K+.
--
-- Step 1: wipe the 3 placeholder rows (Kiaraa / Aish 1v1 / Kamz NAINA) that
-- were seeded by the previous migration. We DELETE FROM the whole table
-- instead of targeting ids so a re-run on a partially-edited DB still ends
-- in a known state.
--
-- Step 2: re-seed with the 3 real stories above. posted_at timestamps are
-- approximate unix-seconds anchored around 2026-05-18:
--   Story 1 ≈ 1 month ago   → 2026-04-18 → 1776470400  (9-day resolution arc)
--   Story 2 ≈ 6 months ago  → 2025-11-18 → 1763424000  (covers end-2024 → 2025 arc)
--   Story 3 ≈ 2 weeks ago   → 2026-05-04 → 1777852800
--
-- sort_order is 0/1/2 so the homepage renders them in the order above
-- (Story 1 first, Story 3 last). featured=1 and public_enabled=1 so they
-- show on the public homepage immediately.
-- 2026-05-18

DELETE FROM case_studies;

INSERT INTO case_studies (
  id, title, client_name, asset_type, posted_at,
  metric_1_label, metric_1_value, metric_1_icon,
  metric_2_label, metric_2_value, metric_2_icon,
  metric_3_label, metric_3_value, metric_3_icon,
  sort_order, featured, public_enabled
) VALUES
  (
    'aish-remonetization',
    'AiSH is Live — Channel Cleanup & Remonetization',
    'AiSH is Live',
    'long_form',
    1776470400,
    'Status', 'Demonetization → Monetized', 'Shield',
    'Time',   '9-day Resolution',           'Clock',
    'How',    'Original Content + SEO',     'Sparkles',
    0, 1, 1
  ),
  (
    'kundan-parashar-takeover',
    'Kundan Parashar — End-of-2024 Channel Takeover',
    'Kundan Parashar',
    'long_form',
    1763424000,
    'Subscribers',  '10K+',         'Users',
    'Total Views',  '250K+',        'Eye',
    'Niche',        'Devotional',   'Sparkles',
    1, 1, 1
  ),
  (
    'ap-sports-arena-reels',
    'AP Sports Arena — Reels That Punch Above the Page',
    'AP Sports Arena',
    'short',
    1777852800,
    'Avg Views per Reel', '10K+',   'Eye',
    'Peak Reel',          '50K+',   'TrendingUp',
    'Page Age',           'New',    'Sparkles',
    2, 1, 1
  );

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'case_studies.seed_replaced_real',
  'info',
  '2026-05-18 replaced placeholder case_studies rows with 3 real Shinel stories (AiSH remonetization, Kundan Parashar takeover, AP Sports Arena reels)',
  '{"version":"2026-05-18","replaced":3,"ids":["aish-remonetization","kundan-parashar-takeover","ap-sports-arena-reels"]}'
);
