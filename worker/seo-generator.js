/**
 * seo-generator.js — Personal SEO generator powered by Claude Haiku.
 *
 * Given a video's transcript + the client's personal context, generate:
 *   - title (matches the client's title patterns, hits niche keywords)
 *   - description (intro hook + body + CTAs + hashtags, matching past style)
 *   - tags (32 tags, ~485 chars, blending niche + transcript keywords +
 *           competitor overperformer hooks)
 *
 * Cost: Claude Haiku 4.5 at roughly $0.001 per generation given typical
 * context size. Worth every cent vs hand-writing each one.
 *
 * Required env secret: ANTHROPIC_API_KEY
 */

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const CLAUDE_API = "https://api.anthropic.com/v1/messages";

// Truncate transcript to a safe size — Haiku has 200K context but the LLM
// doesn't need every word. The first 2000 + last 500 chars capture intro
// hooks + the typical mid/late energy peaks for SEO purposes.
function truncateTranscript(text, max = 5000) {
  if (!text || text.length <= max) return text || "";
  const head = text.slice(0, max - 500);
  const tail = text.slice(-500);
  return `${head}\n\n[...mid-section trimmed...]\n\n${tail}`;
}

/**
 * Gather everything Claude needs to personalize the SEO for THIS creator.
 * Returns a context object with:
 *   - client: { name, niche_tag, secondary_niche_tag, ... }
 *   - top_performers: last N highest-view videos with their titles
 *   - applied_seo_patterns: last N successful RESEOs we did for this client
 *   - competitor_overperformers: top viral videos from their competitors
 */
export async function gatherClientContext(env, clientId) {
  const [client, topPerformers, appliedSeo, competitorOver] = await Promise.all([
    env.DB.prepare(
      "SELECT id, name, niche_tag, secondary_niche_tag, retainer_tier FROM clients WHERE id = ?1"
    ).bind(clientId).first(),
    env.DB.prepare(
      `SELECT title, views, likes, comments, is_short, published_at
       FROM video_stats
       WHERE client_id = ?1 AND age_days >= 3
       GROUP BY video_id
       ORDER BY MAX(views) DESC LIMIT 10`
    ).bind(clientId).all(),
    env.DB.prepare(
      `SELECT new_title, new_description_first_line, action, applied_at
       FROM seo_history
       WHERE client_id = ?1 AND applied = 1
       ORDER BY applied_at DESC LIMIT 10`
    ).bind(clientId).all(),
    env.DB.prepare(
      `SELECT ch.overperformers_json, ch.captured_date, c.name AS competitor_name
       FROM competitor_history ch
       JOIN competitors c ON ch.channel_id = c.channel_id
       WHERE ch.client_id = ?1 AND ch.overperformers_json IS NOT NULL
         AND ch.captured_date >= date('now', '-14 days')
       ORDER BY ch.captured_date DESC LIMIT 20`
    ).bind(clientId).all(),
  ]);

  // Flatten competitor overperformer videos
  const allOver = [];
  for (const row of competitorOver.results || []) {
    try {
      const arr = JSON.parse(row.overperformers_json || "[]");
      for (const v of arr) {
        allOver.push({ ...v, competitor: row.competitor_name });
      }
    } catch {}
  }
  // Take top 8 by views
  allOver.sort((a, b) => (b.views || 0) - (a.views || 0));

  return {
    client: client || { id: clientId, name: "Unknown" },
    top_performers: (topPerformers.results || []).slice(0, 10),
    applied_seo_patterns: (appliedSeo.results || []).slice(0, 10),
    competitor_overperformers: allOver.slice(0, 8),
  };
}

/**
 * Build the system + user prompt for Claude. Heavy on examples + constraints
 * so the model doesn't hallucinate generic SEO. Returns a single user message.
 */
function buildPrompt(ctx, video) {
  const { client, top_performers, applied_seo_patterns, competitor_overperformers } = ctx;
  const lines = [];
  lines.push(`You are a YouTube SEO specialist working for Shinel Studios, doing personalized SEO for one specific creator's new video.`);
  lines.push(``);
  lines.push(`## The Creator`);
  lines.push(`Name: ${client.name}`);
  if (client.niche_tag) lines.push(`Niche: ${client.niche_tag}`);
  if (client.secondary_niche_tag) lines.push(`Secondary niche: ${client.secondary_niche_tag}`);
  lines.push(``);
  lines.push(`## This New Video`);
  lines.push(`Working title: ${video.title || "(none)"}`);
  if (video.is_short) lines.push(`Format: YouTube Short (vertical, <60s)`);
  else lines.push(`Format: Long-form video`);
  lines.push(``);
  lines.push(`Transcript (key portions):`);
  lines.push(`"""`);
  lines.push(truncateTranscript(video.transcript || "(no transcript available)"));
  lines.push(`"""`);
  lines.push(``);

  if (top_performers.length > 0) {
    lines.push(`## What's Already Worked for ${client.name} (top videos by views)`);
    for (const v of top_performers.slice(0, 7)) {
      lines.push(`- "${v.title}" — ${v.views.toLocaleString()} views${v.is_short ? " (Short)" : ""}`);
    }
    lines.push(``);
  }

  if (applied_seo_patterns.length > 0) {
    lines.push(`## Recent SEO We've Applied for ${client.name}`);
    for (const s of applied_seo_patterns.slice(0, 5)) {
      lines.push(`- ${s.new_title || "(batch)"}`);
    }
    lines.push(``);
  }

  if (competitor_overperformers.length > 0) {
    lines.push(`## Competitor Overperformers (recent viral videos in their space)`);
    for (const v of competitor_overperformers.slice(0, 6)) {
      lines.push(`- "${v.title}" — ${(v.views || 0).toLocaleString()} views (${v.competitor})`);
    }
    lines.push(``);
  }

  lines.push(`## Your Task`);
  lines.push(`Generate SEO for this new video that:`);
  lines.push(`1. Matches THIS creator's voice and title style (study the past performers above)`);
  lines.push(`2. Hits searchable terms from their niche`);
  lines.push(`3. Draws on what made their past videos and competitor overperformers click`);
  lines.push(`4. Stays factual — only claim what the transcript supports`);
  lines.push(``);
  lines.push(`Return JSON ONLY (no markdown, no prose) with this exact shape:`);
  lines.push(`{`);
  lines.push(`  "title": "<title 60-70 chars max, optimized for click + searchability>",`);
  lines.push(`  "description": "<full description 800-1500 chars: hook line, 2-3 paragraphs of context, CTAs, hashtags at the bottom>",`);
  lines.push(`  "tags": ["<32 tags, each lowercase, mix of niche + transcript keywords + competitor-adjacent hooks; total under 500 chars when joined by commas>"],`);
  lines.push(`  "reasoning": "<2-3 sentences on what choices you made and why>"`);
  lines.push(`}`);

  return lines.join("\n");
}

/**
 * Call Claude Haiku to generate personalized SEO.
 * Returns { ok, title, description, tags, reasoning, raw } or { ok: false, error }.
 */
export async function generateSeoWithClaude(env, ctx, video) {
  if (!env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not configured" };
  }
  const prompt = buildPrompt(ctx, video);

  let res;
  try {
    res = await fetch(CLAUDE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (e) {
    return { ok: false, error: `Claude API fetch failed: ${e.message}` };
  }

  if (!res.ok) {
    const txt = await res.text();
    return { ok: false, error: `Claude API ${res.status}: ${txt.slice(0, 300)}` };
  }
  const j = await res.json();
  const text = j.content?.[0]?.text || "";
  if (!text) return { ok: false, error: "Claude returned empty content", raw: j };

  // Extract JSON from the response (Claude sometimes wraps in ```json blocks)
  let jsonText = text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonText = jsonMatch[1].trim();
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, error: `Failed to parse JSON from Claude: ${e.message}`, raw: text };
  }

  return {
    ok: true,
    title: String(parsed.title || "").slice(0, 100),
    description: String(parsed.description || ""),
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 35).map((t) => String(t)) : [],
    reasoning: String(parsed.reasoning || ""),
    raw: text,
    model: CLAUDE_MODEL,
    usage: j.usage || null,
  };
}

/**
 * Full pipeline: take a video + its transcript, generate personalized SEO,
 * insert as a pending seo_history row, fire Discord notification.
 *
 * Returns { ok, seo_history_id, title, ... } or { ok: false, error }.
 */
export async function generateAndStoreSeoProposal(env, { videoId, clientId, title, transcript, isShort }) {
  if (!clientId) return { ok: false, error: "clientId required" };
  if (!videoId) return { ok: false, error: "videoId required" };

  // 1. Gather personal context
  const ctx = await gatherClientContext(env, clientId);

  // 2. Generate SEO via Claude
  const seo = await generateSeoWithClaude(env, ctx, {
    title: title || ctx.client.name + " video",
    transcript,
    is_short: !!isShort,
    video_id: videoId,
  });

  if (!seo.ok) return seo;

  // 3. Compute tag counts/chars for the summary columns
  const tagsStr = (seo.tags || []).join(", ");
  const tagsChars = tagsStr.length;
  const tagsCount = (seo.tags || []).length;
  const descFirstLine = (seo.description || "").split("\n")[0].slice(0, 280);

  // 4. Insert as a pending seo_history proposal
  const payloadJson = JSON.stringify({
    auto_generated: true,
    model: seo.model,
    reasoning: seo.reasoning,
    usage: seo.usage,
    new_title: seo.title,
    new_description: seo.description,
    new_tags: seo.tags,
    source: "auto:transcript-llm",
    generated_at: new Date().toISOString(),
  });
  const ins = await env.DB.prepare(
    `INSERT INTO seo_history
       (client_id, asset_type, video_id, action, new_title, new_description_first_line,
        new_tags_count, new_tags_chars, changes_summary, payload_json, applied, notes)
     VALUES (?1, ?2, ?3, 'reseo', ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10)`
  ).bind(
    clientId,
    isShort ? "short" : "video",
    videoId,
    seo.title,
    descFirstLine,
    tagsCount,
    tagsChars,
    seo.reasoning?.slice(0, 500) || null,
    payloadJson,
    `Auto-generated by ${seo.model} from transcript + client context (${ctx.top_performers.length} past performers + ${ctx.competitor_overperformers.length} competitor signals).`
  ).run();
  const seoId = ins?.meta?.last_row_id;

  return {
    ok: true,
    seo_history_id: seoId,
    title: seo.title,
    description: seo.description,
    tags: seo.tags,
    reasoning: seo.reasoning,
    model: seo.model,
    usage: seo.usage,
  };
}
