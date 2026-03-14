const fs = require('fs');
const workerCode = fs.readFileSync('./worker/worker.js', 'utf8');

// Strip out the export default
const code = workerCode.replace(/export default\s*{[\s\S]*$/, '');

const testScript = `
${code}

async function test() {
  const env = { 
    YOUTUBE_API_KEYS: process.env.YOUTUBE_API_KEY 
  };
  
  // Kamz Inkzone ID
  const channelId = "UC_N0eSX2RI_ah-6MjJIAyzA";
  const playlistId = "UU_N0eSX2RI_ah-6MjJIAyzA";
  
  try {
    const result = await fetchYouTubePulse(env, channelId, playlistId);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
`;

fs.writeFileSync('test_pulse.js', testScript);
console.log("Written to test_pulse.js");
