// api/_lib/github.js — shared GitHub Contents API helpers.
// Used to read/write JSON files in the private repo directly from Vercel
// serverless functions (no database needed — same pattern as api/approve.js).

"use strict";

const https = require("https");

const REPO = "amfan49/sade-begam";
const BRANCH = "main";

function ghGet(path, token) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: "api.github.com",
      path,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "sade-begam"
      }
    }, (r) => {
      let data = "";
      r.on("data", (c) => { data += c; });
      r.on("end", () => {
        if (r.statusCode === 404) return resolve(null);
        if (r.statusCode !== 200) return reject(new Error(`GitHub GET ${path} → ${r.statusCode}`));
        resolve(JSON.parse(data));
      });
    }).on("error", reject);
  });
}

function ghPut(path, token, body) {
  const raw = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.github.com",
      path,
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(raw),
        "User-Agent": "sade-begam"
      }
    }, (r) => {
      let data = "";
      r.on("data", (c) => { data += c; });
      r.on("end", () => {
        if (r.statusCode < 200 || r.statusCode > 299) return reject(new Error(`GitHub PUT ${path} → ${r.statusCode}: ${data}`));
        resolve(JSON.parse(data));
      });
    });
    req.on("error", reject);
    req.write(raw);
    req.end();
  });
}

// Reads a JSON file from the repo. Returns { data, sha } — sha is null if
// the file does not exist yet (first write will create it).
async function readJsonFile(repoPath, token) {
  const file = await ghGet(`/repos/${REPO}/contents/${repoPath}`, token);
  if (!file) return { data: null, sha: null };
  const data = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  return { data, sha: file.sha };
}

async function writeJsonFile(repoPath, token, data, sha, message) {
  const content = Buffer.from(JSON.stringify(data, null, 2) + "\n").toString("base64");
  const body = { message, content, branch: BRANCH };
  if (sha) body.sha = sha;
  return ghPut(`/repos/${REPO}/contents/${repoPath}`, token, body);
}

module.exports = { ghGet, ghPut, readJsonFile, writeJsonFile, REPO, BRANCH };
