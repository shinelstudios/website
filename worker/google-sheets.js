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

// Multi-scope token — we lazily lend the same token to google-drive.js so we
// don't have to do two OAuth exchanges per cold start.
// Full `drive` scope (not drive.file) is required so the SA can create a
// brand-new SHARED DRIVE per client — drive.file only lets the SA see files
// it created, which isn't enough for `POST /drives`.
const SCOPE = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive";
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
// Exported so google-drive.js shares the same in-isolate token cache.
export { getAccessToken };
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
 * Read a contiguous range of cells from a tab. Returns a 2D array of strings.
 * Used by the importer to pull existing rows from the Monthly Tracker.
 */
export async function readRange(env, spreadsheetId, range) {
  const token = await getAccessToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sheets readRange failed (${res.status}): ${txt}`);
  }
  const j = await res.json();
  return j.values || [];
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
 * Read the data validation rules for the header row + first data row of a tab.
 * Returns a column-letter → array-of-allowed-values map, e.g.
 *   { "C": ["Design", "Reel", "Video"], "E": ["Started", "In Progress", ...] }
 * Used to discover the canonical dropdown values so cockpit writes match.
 *
 * Implementation: fetch the tab's structural data (includes dataValidation
 * rules) via spreadsheets.get with `includeGridData=true`, then read the
 * OneOfList rule for each cell in row 2 (the first data row — row 1 is
 * headers without validation).
 */
export async function readDropdownRules(env, spreadsheetId, tabName) {
  const token = await getAccessToken(env);
  const range = `${encodeURIComponent(tabName)}!A2:Z2`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?ranges=${range}&includeGridData=true&fields=sheets(data(rowData(values(dataValidation,userEnteredValue))))`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sheets readDropdownRules failed (${res.status}): ${txt}`);
  }
  const j = await res.json();
  const values = j.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values || [];
  const result = {};
  values.forEach((cell, i) => {
    const dv = cell?.dataValidation;
    if (!dv) return;
    const colLetter = String.fromCharCode(65 + i); // A,B,C…
    const condition = dv.condition || {};
    // ONE_OF_LIST: hard-coded list of allowed values
    if (condition.type === "ONE_OF_LIST" && Array.isArray(condition.values)) {
      result[colLetter] = condition.values.map((v) => v.userEnteredValue).filter(Boolean);
    }
    // ONE_OF_RANGE: dropdown sourced from another range — we'd have to read
    // that range too. Skipping for now; user can switch to ONE_OF_LIST.
    if (condition.type === "ONE_OF_RANGE") {
      result[colLetter] = ["(dropdown sourced from another range — open the sheet to view)"];
    }
  });
  return result;
}

/**
 * Map a value (case-insensitive) to the closest match in an allowed list.
 * If the input matches exactly (after lowercasing) → return the canonical
 * form. Otherwise return the original value as-is so Sheets shows the
 * red-triangle warning and the founder can decide what to do.
 */
export function matchToDropdown(value, allowedValues) {
  if (!value || !Array.isArray(allowedValues) || allowedValues.length === 0) return value;
  const v = String(value).trim().toLowerCase();
  // Exact match (case-insensitive)
  const exact = allowedValues.find((a) => String(a).trim().toLowerCase() === v);
  if (exact) return exact;
  // Loose prefix match — but ONLY when the shorter side is at least 4 chars
  // long. Without this guard "in" would match against allowed "In Progress"
  // and silently snap an entirely different status, OR a short cockpit
  // value would match too many candidates and pick the wrong one.
  // Founder feedback: previous loose match corrupted short statuses.
  const partial = allowedValues.find((a) => {
    const aLower = String(a).trim().toLowerCase();
    const minLen = Math.min(v.length, aLower.length);
    if (minLen < 4) return false;
    return aLower.startsWith(v) || v.startsWith(aLower);
  });
  return partial || value;
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
export function projectToRow(project, clientName, editorName, dropdownRules = null) {
  // Cockpit-side label normalization. The sheet's dataValidation may use
  // different capitalization (e.g. "In Progress" vs cockpit's "in_progress"),
  // so we first normalize to a clean Title-Case label, then matchToDropdown
  // snaps it to the actual sheet dropdown value when rules are provided.
  const STATUS_LABELS = {
    "planned": "Planned",
    "in-progress": "In Progress",
    "in_progress": "In Progress",
    "started": "Started",
    "completed": "Completed",
    "posted": "Posted",
    "added-to-website": "Added to Website",
    "paid": "Paid",
    "cancelled": "Cancelled",
    "pending-payment": "Pending Payment",
    "pending_payment": "Pending Payment",
  };
  const ASSET_TYPE_LABELS = {
    "reel": "Reel",
    "short": "Short",
    "shorts": "Shorts",
    "video": "Video",
    "long-form": "Long-form",
    "stream": "Stream",
    "thumbnail": "Thumbnail",
    "design": "Design",
    "edit": "Edit",
  };
  const titleCase = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());

  const rawStatus = project.status || "";
  const rawType = project.asset_type || project.project_type || "";
  const rawSubtype = project.asset_subtype || "";

  let statusLabel = STATUS_LABELS[rawStatus.toLowerCase()] || titleCase(rawStatus);
  let typeLabel   = ASSET_TYPE_LABELS[rawType.toLowerCase()] || titleCase(rawType);
  let subtypeLabel = titleCase(rawSubtype);

  // If we know the sheet's dropdown rules, snap our values to the exact
  // canonical form so Sheets accepts them without a red-triangle warning.
  if (dropdownRules) {
    if (dropdownRules.C) typeLabel    = matchToDropdown(typeLabel,    dropdownRules.C);
    if (dropdownRules.D) subtypeLabel = matchToDropdown(subtypeLabel, dropdownRules.D);
    if (dropdownRules.E) statusLabel  = matchToDropdown(statusLabel,  dropdownRules.E);
    // Column J = Editor Assigned often has a dropdown too
    if (dropdownRules.J && editorName) editorName = matchToDropdown(editorName, dropdownRules.J);
    // Column A = Client Name might have a dropdown
    if (dropdownRules.A && clientName) clientName = matchToDropdown(clientName, dropdownRules.A);
  }

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
    typeLabel,                                      // C Project Type
    subtypeLabel,                                   // D Project Sub Type
    statusLabel,                                    // E Status
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
