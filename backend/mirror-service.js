import 'dotenv/config';
import { google } from 'googleapis';
import { spawnSync } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Defense-in-depth URL validation. The Worker already rejects non-YouTube URLs before
// inserting into media_library, but if anything bypasses that path we refuse to shell
// out to yt-dlp with untrusted input.
function isSafeYouTubeUrl(input) {
  if (typeof input !== 'string' || input.length === 0 || input.length > 500) return false;
  if (/[;$`\n\r|&<>]/.test(input)) return false;
  let u;
  try { u = new URL(input); } catch { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.username || u.password || u.port) return false;
  const ALLOWED_HOSTS = new Set([
    'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com',
  ]);
  return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
}

/**
 * YouTube Mirror Service
 * This script runs as a background process to archive videos from clients to your own channel.
 * 
 * Pre-requisites:
 * 1. install yt-dlp (https://github.com/yt-dlp/yt-dlp)
 * 2. Setup Google Cloud Project with YouTube Data API v3
 * 3. Create .env with CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID
 * 4. Setup OAuth2 credentials
 */

const CF_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}`;
const CF_HEADERS = {
  'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
  'Content-Type': 'application/json'
};

const youtube = google.youtube('v3');
const oauth2Client = new google.auth.OAuth2(
  process.env.YT_CLIENT_ID,
  process.env.YT_CLIENT_SECRET,
  process.env.YT_REDIRECT_URI
);

// We assume the user has a refresh token saved
oauth2Client.setCredentials({
  refresh_token: process.env.YT_REFRESH_TOKEN
});

async function queryD1(sql, params = []) {
  const res = await axios.post(`${CF_API_BASE}/query`, { sql, params }, { headers: CF_HEADERS });
  return res.data.result[0];
}

async function processPendingMirrors() {
  console.log('--- Checking for pending mirrors ---');
  try {
    const result = await queryD1("SELECT * FROM media_library WHERE status = 'pending_mirror' LIMIT 5");
    const items = result.results;

    if (!items || items.length === 0) {
      console.log('No pending mirrors found.');
      return;
    }

    for (const item of items) {
      await mirrorVideo(item);
    }
  } catch (e) {
    console.error('D1 Query Error:', e.response?.data || e.message);
  }
}

async function mirrorVideo(item) {
  // Reject anything that isn't a clean YouTube URL before spawning a child process.
  if (!isSafeYouTubeUrl(item.source_url)) {
    console.error(`[${item.id}] Refusing unsafe source_url; marking as failed.`);
    await queryD1("UPDATE media_library SET status = 'failed' WHERE id = ?", [item.id]);
    return;
  }
  const videoId = item.source_url.split('v=')[1]?.split('&')[0];
  if (!videoId) return;

  const tempFile = path.join(process.cwd(), `temp_${item.id}.mp4`);

  try {
    console.log(`[${item.id}] Downloading: ${item.source_url}`);
    // Array-form spawnSync with shell:false — source_url is never interpreted by a shell,
    // so metacharacters like `;`, `$(...)`, and backticks cannot inject commands.
    const result = spawnSync('yt-dlp', [
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--output', tempFile,
      '--no-playlist',
      item.source_url,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      timeout: 10 * 60 * 1000, // 10 minutes
    });
    if (result.status !== 0) {
      throw new Error(`yt-dlp exited ${result.status}: ${result.stderr?.toString?.().slice(0, 500) || ''}`);
    }

    console.log(`[${item.id}] Uploading to YouTube Mirror Channel...`);
    const res = await youtube.videos.insert({
      auth: oauth2Client,
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: `[ARCHIVE] ${item.title}`,
          description: `Archived from ${item.source_url}\nOriginal Channel: ${item.channel_title}`,
          categoryId: '22' // People & Blogs
        },
        status: {
          privacyStatus: 'unlisted', // Keep it unlisted
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(tempFile)
      }
    });

    const mirrorId = res.data.id;
    console.log(`[${item.id}] Mirror created: https://youtu.be/${mirrorId}`);

    // Update D1
    await queryD1(
      "UPDATE media_library SET mirror_url = ?, status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [mirrorId, item.id]
    );

    console.log(`[${item.id}] Successfully archived and updated D1.`);

  } catch (e) {
    console.error(`[${item.id}] Mirroring Failed:`, e.response?.data || e.message);
    await queryD1("UPDATE media_library SET status = 'failed' WHERE id = ?", [item.id]);
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

// Run mode:
//   - Long-running daemon (default): polls every 60s forever. Use for local dev.
//   - One-shot (`--once` or GITHUB_ACTIONS=true): process one batch and exit.
//     This is how the GitHub Actions cron invokes us — a new runner spins up every
//     5 minutes, processes whatever's pending, exits. No persistent host needed.
const runOnce = process.argv.includes("--once") || process.env.GITHUB_ACTIONS === "true";

if (runOnce) {
  processPendingMirrors()
    .then(() => { console.log("--- One-shot run complete ---"); process.exit(0); })
    .catch((e) => { console.error("One-shot run failed:", e); process.exit(1); });
} else {
  setInterval(processPendingMirrors, 60000);
  processPendingMirrors();
}
