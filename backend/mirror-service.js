import 'dotenv/config';
import { google } from 'googleapis';
import { execSync } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
  const videoId = item.source_url.split('v=')[1]?.split('&')[0];
  if (!videoId) return;

  const tempFile = path.join(process.cwd(), `temp_${item.id}.mp4`);
  
  try {
    console.log(`[${item.id}] Downloading: ${item.source_url}`);
    // Using yt-dlp to download the video
    execSync(`yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --output "${tempFile}" "${item.source_url}"`);

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

// Run loop
setInterval(processPendingMirrors, 60000); // Check every minute
processPendingMirrors();
