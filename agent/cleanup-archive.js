// cleanup-archive.js — removes archive items older than 2 years
// Run by GitHub Actions on the 1st of every month.

const fs   = require("fs");
const path = require("path");

const ARCHIVE_PATH = path.join(__dirname, "..", "public", "data", "archive.json");
const TWO_YEARS_MS = 2 * 365.25 * 24 * 60 * 60 * 1000;

const archive  = JSON.parse(fs.readFileSync(ARCHIVE_PATH, "utf8"));
const cutoff   = new Date(Date.now() - TWO_YEARS_MS).toISOString().split("T")[0];
const before   = (archive.items || []).length;

archive.items  = (archive.items || []).filter(item => (item.date || "") >= cutoff);
const removed  = before - archive.items.length;

fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2));
console.log(`Cutoff date: ${cutoff}`);
console.log(`Removed: ${removed} item(s) older than 2 years.`);
console.log(`Remaining: ${archive.items.length} item(s).`);
