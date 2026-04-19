// One-shot helper to mint a fresh YouTube OAuth refresh token.
// Starts a local server on :3000, prints the consent URL, captures Google's
// redirect, exchanges the code, prints the refresh token, then exits.
import 'dotenv/config';
import { google } from 'googleapis';
import http from 'http';

const oauth2 = new google.auth.OAuth2(
  process.env.YT_CLIENT_ID,
  process.env.YT_CLIENT_SECRET,
  process.env.YT_REDIRECT_URI || 'http://localhost:3000'
);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // force Google to return a refresh_token
  scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube'],
});

console.log('\n=== OPEN THIS URL IN YOUR BROWSER ===\n');
console.log(authUrl);
console.log('\nWaiting for Google to redirect back to http://localhost:3000/ ...\n');

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, 'http://localhost:3000');
    const code = reqUrl.searchParams.get('code');
    const err = reqUrl.searchParams.get('error');
    if (err) {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end(`Google error: ${err}`);
      console.error('Google returned error:', err);
      server.close(() => process.exit(1));
      return;
    }
    if (!code) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Waiting for ?code=...');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('✅ Refresh token captured. You can close this tab.');

    const { tokens } = await oauth2.getToken(code);
    const rt = tokens.refresh_token;
    if (!rt) {
      console.error('\n❌ No refresh_token in response. Retry — and in the consent screen, fully re-authorize.');
      server.close(() => process.exit(1));
      return;
    }
    console.log('\n====== YT_REFRESH_TOKEN ======');
    console.log(rt);
    console.log('====== END ======\n');
    server.close(() => process.exit(0));
  } catch (e) {
    console.error('Token exchange failed:', e.message);
    try {
      res.writeHead(500);
      res.end('Token exchange failed — see terminal.');
    } catch { /* */ }
    server.close(() => process.exit(1));
  }
});

server.listen(3000, () => {
  // URL was printed above
});
