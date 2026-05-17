/**
 * google-drive.js — minimal Google Drive v3 helper.
 *
 * One job: create a Drive folder for a newly-onboarded client, optionally with
 * standard sub-folders, and return { id, url }. Reuses the OAuth token from
 * google-sheets.js so cold-start cost is amortized across both services.
 *
 * SAFETY: uses drive.file scope. The service account can ONLY create / edit
 * files inside folders that have been explicitly shared with the SA email.
 * It cannot reach across the founder's whole Drive.
 *
 * Required env:
 *   - GOOGLE_SA_JSON              — service-account JSON
 *   - DRIVE_PARENT_FOLDER_ID      — Drive folder ID to nest new client folders under
 *                                    (must be shared with the SA email as Editor)
 */

import { getAccessToken } from "./google-sheets.js";

const DRIVE_API = "https://www.googleapis.com/drive/v3";

// Default sub-folders inside each new client folder. Matches the structure
// the founder has been creating by hand for years — keeps the on-disk
// muscle memory intact for editors who already know where to drop a file.
const DEFAULT_SUBFOLDERS = [
  "01 - Raw Footage",
  "02 - Project Files",
  "03 - Thumbnails",
  "04 - Final Exports",
  "05 - SEO + Briefs",
];

async function driveFetch(env, path, init = {}) {
  const token = await getAccessToken(env);
  const res = await fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Drive API ${path} failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Create a single folder. `parentId` is the Drive folder ID to nest into.
 * Returns { id, name, webViewLink }.
 */
async function createFolder(env, name, parentId) {
  const body = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentId ? [parentId] : undefined,
  };
  // ?fields= asks Drive to return the webViewLink so we don't need a second
  // call to find the human URL.
  return driveFetch(env, "/files?fields=id,name,webViewLink", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * createClientDriveFolder — the public-facing helper used by the new-client
 * insert path. Creates a top-level folder under DRIVE_PARENT_FOLDER_ID with
 * the client's name, plus DEFAULT_SUBFOLDERS. Never throws — returns
 * { ok:false, error } when something's misconfigured so the new-client
 * request still succeeds (Drive folder is a nice-to-have, not a blocker).
 */
export async function createClientDriveFolder(env, clientName) {
  if (!env.GOOGLE_SA_JSON) return { ok: false, error: "GOOGLE_SA_JSON not configured" };
  if (!env.DRIVE_PARENT_FOLDER_ID) return { ok: false, error: "DRIVE_PARENT_FOLDER_ID not set" };

  try {
    const main = await createFolder(env, clientName, env.DRIVE_PARENT_FOLDER_ID);
    // Fire the sub-folder creates in parallel — Drive API is happy with concurrency
    const subResults = await Promise.allSettled(
      DEFAULT_SUBFOLDERS.map((sub) => createFolder(env, sub, main.id))
    );
    const subs = subResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => ({ id: r.value.id, name: r.value.name }));
    const failed = subResults.filter((r) => r.status === "rejected").length;
    return {
      ok: true,
      id: main.id,
      name: main.name,
      url: main.webViewLink,
      subfolders: subs,
      failed_subfolders: failed,
    };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}
