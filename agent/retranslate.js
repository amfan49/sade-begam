// retranslate.js — translate existing items in current-week.json that have fa: null
// One-time script. Run: node agent/retranslate.js

const https = require("https");
const fs    = require("path");
const path  = require("path");
const fss   = require("fs");

const CURRENT_PATH = path.join(__dirname, "..", "public", "data", "current-week.json");

function translate(text, from, to) {
  return new Promise((resolve) => {
    if (!text) return resolve(null);
    const q = encodeURIComponent(text.slice(0, 500));
    const p = `/get?q=${q}&langpair=${from}%7C${to}&de=amfan49%40gmail.com`;
    https.get({ hostname: "api.mymemory.translated.net", path: p, timeout: 10000 }, (r) => {
      let raw = "";
      r.on("data", c => raw += c);
      r.on("end", () => {
        try {
          const j = JSON.parse(raw);
          resolve(j.responseStatus === 200 ? j.responseData.translatedText : null);
        } catch { resolve(null); }
      });
    }).on("error", () => resolve(null)).on("timeout", function() { this.destroy(); resolve(null); });
  });
}

(async () => {
  const current = JSON.parse(fss.readFileSync(CURRENT_PATH, "utf8"));
  let changed = 0;

  for (const item of current.items) {
    if (item.translations?.fa?.headline) {
      console.log(`  ✓ ${item.id} — already translated`);
      continue;
    }
    const lang = item.lang_original || "en";
    if (lang === "fa") { console.log(`  — ${item.id} — original is Persian, skipping`); continue; }

    process.stdout.write(`  Translating ${item.id}…`);
    const faH = await translate(item.headline, lang, "fa");
    const faE = item.excerpt ? await translate(item.excerpt, lang, "fa") : null;

    if (faH) {
      item.translations = { en: null, fa: { headline: faH, excerpt: faE || "" } };
      process.stdout.write(" ✓\n");
      changed++;
    } else {
      process.stdout.write(" (failed)\n");
    }
    await new Promise(r => setTimeout(r, 600)); // stay within rate limit
  }

  fss.writeFileSync(CURRENT_PATH, JSON.stringify(current, null, 2));
  console.log(`\nDone. ${changed} item(s) translated.`);
})();
