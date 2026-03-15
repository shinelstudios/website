import { google } from 'googleapis';
import readline from 'readline';

/**
 * 1. Create a project at https://console.cloud.google.com/
 * 2. Enable "YouTube Data API v3"
 * 3. Go to "Credentials" -> "Create Credentials" -> "OAuth client ID"
 * 4. Application type: "Web application"
 * 5. Authorized redirect URIs: http://localhost:3000
 * 6. Copy Client ID and Client Secret
 */

const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('--- YouTube Auth Setup ---');
console.log('1. Open this URL in your browser:');
console.log(url);
console.log('\n2. Log in and allow permissions.');
console.log('3. After redirecting, you will see a "code=" parameter in the URL.');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\nPaste the code from the URL here: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n--- Success! ---');
    console.log('Your Refresh Token:');
    console.log(tokens.refresh_token);
    console.log('\nCopy this to your .env file as YT_REFRESH_TOKEN.');
  } catch (e) {
    console.error('Error getting token:', e.message);
  } finally {
    rl.close();
  }
});
