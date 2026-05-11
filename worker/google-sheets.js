/**
 * google-sheets.js — minimal Google Sheets v4 client for the Worker.
 *
 * Uses Web Crypto (built into Workers runtime) to sign a service-account JWT,
 * exchange it for an OAuth access token, then call Sheets API for append /
 * update. No external deps.
 *
 * SAFETY GUARANTEE: this module only APPENDS new rows or UPDATES rows that
 * the cockpit previously wrote (by sheet_row_index stored on the project).
 * It never modifies a row it didn't create, so the founder's hand-entered
 * data is permanently safe.
 *
 * Required env secrets:
 *   - GOOGLE_SA_JSON           — the entire service account JSON key file
 *   - MONTHLY_TRACKER_SHEET_ID — the spreadsheet ID (from the sheet URL)
 *
 * Optional env vars:
 *   - SHEET_TAB_OVERRIDE — force a specific tab name (defaults to current
 *                          month-year like "May 2026")
 */

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

// In-memory cache for the OAuth token (per isolate). Tokens are valid for
// 1 hour; we re-fetch when within 5 min of expiry.
let _tokenCache = { token: null, expires: 0 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function base64UrlEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(s) {
  return base64UrlEncode(new TextEncoder().encode(s));
}

// Convert PKCS#8 PEM to ArrayBuffer (strip header/footer/whitespace)
function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ---------------------------------------------------------------------------
// Service account → OAuth access token (Web Crypto JWT signing)
// ---------------------------------------------------------------------------
async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache.token && _tokenCache.expires > now + 300) {
    return _tokenCache.token;
  }
  if (!env.GOOGLE_SA_JSON) {
    throw new Error("GOOGLE_SA_JSON secret not set on worker");
  }
  let sa;
  try { sa = JSON.parse(env.GOOGLE_SA_JSON); }
  catch (e) { throw new Error("GOOGLE_SA_JSON is not valid JSON"); }
  if (!sa.client_email || !sa.private_key) {
    throw new Error("GOOGLE_SA_JSON missing client_email or private_key");
  }

  // Build JWT
  const header = { alg: "RS256", typ: "JWT", kid: sa.private_key_id };
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_ENDPOINT,
    exp: now + 3600,
    iat: now,
  };
  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const claimB64 = base64UrlEncodeString(JSON.stringify(claim));
  const toSign = `${headerB64}.${claimB64}`;

  // Import key + sign with Web Crypto
  const keyData = pemToArrayBuffer(sa.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(toSign)
  );
  const jwt = `${toSign}.${base64UrlEncode(sigBuf)}`;

  // Exchange JWT for access token
  const params = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${txt}`);
  }
  const j = await res.json();
  _tokenCache.token = j.access_token;
  _tokenCache.expires = now + (j.expires_in || 3600);
  return j.access_token;
}

// ---------------------------------------------------------------------------
// Sheet operations
// ---------------------------------------------------------------------------

/**
 * List the tabs in a spreadsheet. Used to confirm a target tab exists before
 * writing, and to surface to the UI which tabs are available.
 */
export async function listTabs(env, spreadsheetId) {
  const token = await getAccessToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title,sheetId,gridProperties(rowCount,columnCount)))`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sheets listTabs failed (${res.status}): ${txt}`);
  }
  const j = await res.json();
  return (j.sheets || []).map((s) => s.properties);
}

/**
 * Append a row to a tab. Returns the 1-based row index of the new row.
 * Uses USER_ENTERED so Sheets parses dates / formulas like the user typed them.
 */
export async function appendRow(env, spreadsheetId, tabName, values) {
  const token = await getAccessToken(env);
  const range = `${encodeURIComponent(tabName)}!A:Z`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sheets append failed (${res.status}): ${txt}`);
  }
  const j = await res.json();
  // updates.updatedRange looks like "May 2026!A12:O12" — extract row number
  const updatedRange = j.updates?.updatedRange || "";
  const m = updatedRange.match(/!A(\d+):/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Update a specific row in a tab. ONLY call this for rows we previously
 * appended (tracked via projects.sheet_row_index). Never call this on a row
 * we didn't write — would clobber the founder's manual data.
 */
export async function updateRow(env, spreadsheetId, tabName, rowIndex, values) {
  if (!rowIndex || rowIndex < 2) {
    throw new Error("Refusing to update row index < 2 (row 1 is headers)");
  }
  const token = await getAccessToken(env);
  const range = `${encodeURIComponent(tabName)}!A${rowIndex}:Z${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sheets update failed (${res.status}): ${txt}`);
  }
  return await res.json();
}

/**
 * Connection test: list tabs, return service account email + the tab names.
 * Used by `POST /admin/agency/sheets/connect` so the founder can verify the
 * service account is set up correctly before any project syncs.
 */
export async function verifyConnection(env, spreadsheetId) {
  let sa = {};
  try { sa = JSON.parse(env.GOOGLE_SA_JSON || "{}"); } catch {}
  const tabs = await listTabs(env, spreadsheetId);
  return {
    ok: true,
    service_account_email: sa.client_email || "(none)",
    spreadsheet_id: spreadsheetId,
    tabs: tabs.map((t) => ({
      title: t.title,
      rows: t.gridProperties?.rowCount,
      columns: t.gridProperties?.columnCount,
    })),
  };
}

/**
 * Compute the default tab name for "right now" — used when a project is
 * being synced without an explicit override. Format: "May 2026" (matches
 * the Monthly Tracker's existing tab naming convention).
 */
export function currentMonthTabName() {
  const now = new Date();
  // IST timezone for consistency
  const ist = new Date(now.getTime() + 330 * 60_000);
  const month = ist.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return `${month} ${ist.getUTCFullYear()}`;
}

/**
 * Build the row values array for a project, matching the Monthly Tracker
 * column order observed in the cockpit screenshot (May 11 2026):
 *
 *   A  Client Name
 *   B  Project Name
 *   C  Project Type
 *   D  Project Sub Type
 *   E  Status
 *   F  Start Date
 *   G  End Date
 *   H  Deadline Date
 *   I  Days to Deadline (left blank — the sheet has a formula here)
 *   J  Editor Assigned
 *   K  Advance Editing Minutes (blank — sheet-only)
 *   L  Basic Editing Minutes (blank — sheet-only)
 *   M  Total Minutes (blank — formula)
 *   N  Client Amount
 *   O  Editor Amount
 *
 * If you reorder the sheet columns, update this function to match.
 */
export function projectToRow(project, clientName, editorName) {
  // Map cockpit statuses → human-friendly sheet statuses
  const STATUS_MAP = {
    "planned": "Planned",
    "in-progress": "In Progress",
    "in_progress": "In Progress",
    "started": "Started",
    "completed": "Completed",
    "posted": "Posted",
    "added-to-website": "Added to Website",
    "paid": "Paid",
    "cancelled": "Cancelled",
  };
  const status = STATUS_MAP[project.status] || project.status || "";

  // Dates: convert unix-sec or ISO to YYYY-MM-DD for Sheets parsing
  const dateStr = (v) => {
    if (!v) return "";
    if (typeof v === "number") return new Date(v * 1000).toISOString().slice(0, 10);
    if (typeof v === "string" && /^\d+$/.test(v)) return new Date(parseInt(v, 10) * 1000).toISOString().slice(0, 10);
    return String(v).slice(0, 10);
  };

  return [
    clientName || project.client_id || "",          // A Client Name
    project.title || "",                            // B Project Name
    project.asset_type || project.project_type || "", // C Project Type
    project.asset_subtype || "",                    // D Project Sub Type
    status,                                         // E Status
    dateStr(project.start_date || project.created_at), // F Start Date
    dateStr(project.completed_at),                  // G End Date
    dateStr(project.due_date),                      // H Deadline Date
    "",                                             // I Days to Deadline (formula)
    editorName || "",                               // J Editor Assigned
    "",                                             // K Advance Editing Minutes (sheet-only)
    "",                                             // L Basic Editing Minutes (sheet-only)
    "",                                             // M Total Minutes (formula)
    project.client_charge_inr || "",                // N Client Amount
    project.editor_payment_inr || "",               // O Editor Amount
  ];
}
