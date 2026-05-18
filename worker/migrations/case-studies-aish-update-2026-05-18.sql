-- case-studies-aish-update-2026-05-18.sql
--
-- Founder correction for the AiSH is Live remonetization case study.
-- Applies the corrected facts on top of the existing aish-remonetization
-- row in production D1 without re-seeding the rest of the table.
--
-- Corrections:
--   * Resolution time was 9 days, not 30 days.
--   * Drop the "audited / scrubbed / filed appeals with YPP" framing —
--     that was speculation, not what actually happened. The bare facts:
--     hater-driven fake watch hours + superchat refund abuse caused the
--     demonetization, and Shinel got the channel re-monetized by leveling
--     up content quality (good original content), tightening SEO
--     discipline, and refusing to recycle / repeat content.
--   * Final 3 metrics:
--       1. Status: Demonetization → Monetized   (Shield)
--       2. Time:   9-day Resolution              (Clock)
--       3. How:    Original Content + SEO       (Sparkles)
--
-- 2026-05-18

UPDATE case_studies
SET metric_1_label = 'Status', metric_1_value = 'Demonetization → Monetized', metric_1_icon = 'Shield',
    metric_2_label = 'Time',   metric_2_value = '9-day Resolution',           metric_2_icon = 'Clock',
    metric_3_label = 'How',    metric_3_value = 'Original Content + SEO',    metric_3_icon = 'Sparkles',
    updated_at = datetime('now')
WHERE id = 'aish-remonetization';

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'case_studies.aish_remonetization_corrected',
  'info',
  '2026-05-18 founder correction applied to aish-remonetization: 9-day (not 30-day) resolution; dropped speculative audit/appeals framing; metric_3 now Original Content + SEO',
  '{"version":"2026-05-18","id":"aish-remonetization","changes":["metric_2_value:30-day->9-day Resolution","metric_3:Appeals Won 100% -> Original Content + SEO","framing:dropped audit/scrub/YPP-appeals speculation"]}'
);
