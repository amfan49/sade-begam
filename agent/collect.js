// ── Sade Begam — free weekly news collector ───────────────────────
// Fetches official RSS/Atom feeds, keeps items from the last N days that
// mention the keyword (default "iran"), and writes a DRAFT file for human
// review. No paid APIs, no external dependencies (Node built-ins only).
//
// Run:  node agent/collect.js          (uses feeds.json defaults)
//       DAYS=30 node agent/collect.js  (wider window for testing)
//
// Output: public/data/draft-week.json  (you review, then approve into
//         public/data/current-week.json before publishing).

const https = require("https");
const fs = require("fs");
const path = require("path");

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "feeds.json"), "utf8"));
const WINDOW_DAYS = Number(process.env.DAYS || cfg.window_days || 7);
const KEYWORD = (process.env.KEYWORD || cfg.keyword || "iran").toLowerCase();

function fetch(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": "SadeBegamBot/1.0 (+https://sadebegam.com)" }, timeout: 15000 },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
          res.resume();
          return resolve(fetch(new URL(res.headers.location, url).toString(), redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error("HTTP " + res.statusCode));
        }
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

const clean = (s = "") =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? clean(m[1]) : "";
};

function parseItems(xml) {
  const out = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks) {
    let link = tag(b, "link");
    if (!link) {
      const m = b.match(/<link[^>]*href="([^"]+)"/i); // Atom
      if (m) link = m[1];
    }
    const title = tag(b, "title");
    const desc = tag(b, "description") || tag(b, "summary") || tag(b, "content");
    const dateStr = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated");
    out.push({ title, link, desc, date: dateStr ? new Date(dateStr) : null });
  }
  return out;
}

async function main() {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000);
  const collected = [];
  let n = 0;

  for (const f of cfg.feeds) {
    process.stdout.write(`• ${f.organization} … `);
    try {
      const xml = await fetch(f.feed);
      const items = parseItems(xml)
        .filter((it) => (it.title + " " + it.desc).toLowerCase().includes(KEYWORD))
        .filter((it) => !it.date || it.date >= since);

      items.forEach((it) => {
        n++;
        collected.push({
          id: `draft-${String(n).padStart(3, "0")}`,
          date: it.date ? it.date.toISOString().slice(0, 10) : "",
          country: f.country,
          region: f.region,
          flag: f.flag || "🏳️",
          source_organization: f.organization,
          source_url: it.link || f.homepage,
          is_official: true,
          needs_review: true,
          lang_original: f.lang || "en",
          headline: it.title,
          quote_original: "[REVIEW: paste the exact official quote here]",
          excerpt: it.desc.slice(0, 300),
          translations: { en: null, fa: "[بازبینی: ترجمه‌ی فارسی این‌جا]" },
          context: { en: "", fa: "" },
          topics: []
        });
      });
      console.log(`${items.length} match(es)`);
    } catch (e) {
      console.log(`skipped (${e.message})`);
    }
  }

  // Sort newest first so Amir sees the most recent items at the top when reviewing
  collected.sort((a, b) => (b.date || "") > (a.date || "") ? 1 : (b.date || "") < (a.date || "") ? -1 : 0);

  const draft = {
    generated_at: new Date().toISOString(),
    window_days: WINDOW_DAYS,
    keyword: KEYWORD,
    total: collected.length,
    note: "DRAFT — review each item, paste the verified official quote, then move approved items into current-week.json.",
    items: collected
  };

  const outPath = path.join(__dirname, "..", "public", "data", "draft-week.json");
  fs.writeFileSync(outPath, JSON.stringify(draft, null, 2));
  console.log(`\n✓ ${collected.length} candidate item(s) → ${path.relative(process.cwd(), outPath)}`);
}

main().catch((e) => {
  console.error("Collector failed:", e);
  process.exit(1);
});
