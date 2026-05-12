-- Seed the scheduled task that drives the new auto-SEO pipeline.
-- Every 4 hours during day, the laptop browses each managed channel's YT
-- Studio for new unlisted videos. Detected videos kick off the transcript →
-- LLM → SEO proposal chain via worker-side completion side-effects.
-- 2026-05-12

INSERT OR REPLACE INTO scheduled_tasks
  (id, name, description, cron, task_type, payload_json, enabled, created_by)
VALUES (
  'st-unlisted-audit-sweep',
  'Unlisted Studio audit (auto-SEO trigger)',
  'Every 4h during day. For each managed client''s channel, the laptop browses YT Studio /content?filter=visibility,UNLISTED and returns the list of unlisted video IDs + their working titles. Worker side-effects then enqueue transcribe_video for each new one, and the laptop generates a personalized SEO proposal in the same SKILL run (Cowork Claude) using the client''s niche, top performers, applied SEO patterns, and competitor overperformers. Result lands in seo_history applied=0 for cockpit review.',
  '0 7,11,15,19 * * *',
  'unlisted_video_audit',
  '{"prompt":"For every active managed client with at least one entry in client_channels, browse https://studio.youtube.com/channel/{channel_id}/videos?filter=visibility,UNLISTED in the persistent Chrome session. For each unlisted video listed, scrape the video_id, title, and (if available) the scheduled premiere/publish time. Return the result as {videos: [{video_id, title, scheduled_publish_at?, is_short?}], channel_id}. Limit to videos uploaded in the last 7 days to avoid re-processing old archive content. Do NOT click into individual videos — list view scrape only."}',
  1,
  'migration:auto-seo'
);
