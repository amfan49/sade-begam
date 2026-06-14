// approve.js — move reviewed draft items into current-week.json
//
// Usage:
//   node agent/approve.js draft-001 draft-003
//   node agent/approve.js all          (approves every item in draft)
//
// After running: git add + commit + push to publish.
// Persian translations are fetched automatically via MyMemory (free API).

const fs = require("fs");
const path = require("path");
const { translateText } = require("./translate");

const DRAFT_PATH = path.join(__dirname, "..", "public", "data", "draft-week.json");
const CURRENT_PATH = path.join(__dirname, "..", "public", "data", "current-week.json");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node agent/approve.js draft-001 draft-002 ...\n       node agent/approve.js all");
  process.exit(1);
}

(async () => {
  const draft = JSON.parse(fs.readFileSync(DRAFT_PATH, "utf8"));
  const current = JSON.parse(fs.readFileSync(CURRENT_PATH, "utf8"));

  const approveAll = args[0] === "all";
  const requestedIds = new Set(args);

  const toApprove = draft.items.filter(item =>
    approveAll || requestedIds.has(item.id)
  );

  if (toApprove.length === 0) {
    console.error("No matching draft items found. Check your IDs.");
    process.exit(1);
  }

  const week = current.week || `${new Date().getFullYear()}-W${String(getISOWeek(new Date())).padStart(2, "0")}`;
  const existingNums = current.items
    .map(i => parseInt(i.id.split("-").pop(), 10))
    .filter(n => !isNaN(n));
  let nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;

  const cleaned = [];

  for (const item of toApprove) {
    const id = `${week}-${String(nextNum++).padStart(3, "0")}`;

    const headline = cleanEntities(item.headline || "");
    const excerpt = cleanEntities(
      (item.excerpt || "").replace(/\s*The post .+ appeared first on .+\.$/, "").trim()
    );

    // Auto-translate headline + excerpt to Persian (free MyMemory API)
    const srcLang = item.lang_original || "en";
    let faHeadline = null;
    let faExcerpt = null;

    if (srcLang !== "fa") {
      process.stdout.write(`  Translating ${id}…`);
      faHeadline = await translateText(headline, srcLang, "fa");
      faExcerpt = excerpt ? await translateText(excerpt, srcLang, "fa") : null;
      process.stdout.write(faHeadline ? " ✓\n" : " (skipped)\n");
    }

    cleaned.push({
      id,
      date: item.date,
      country: item.country,
      region: item.region,
      flag: item.flag,
      source_organization: item.source_organization,
      source_url: item.source_url,
      is_official: true,
      lang_original: srcLang,
      headline,
      excerpt,
      translations: {
        en: srcLang !== "en" ? null : null,
        fa: faHeadline ? { headline: faHeadline, excerpt: faExcerpt || "" } : null
      },
      topics: item.topics || []
    });
  }

  current.items.push(...cleaned);
  current.published_at = new Date().toISOString();
  delete current.is_sample;

  fs.writeFileSync(CURRENT_PATH, JSON.stringify(current, null, 2));

  console.log(`\n✓ ${cleaned.length} item(s) added to current-week.json:`);
  cleaned.forEach(i => {
    const hasFa = i.translations?.fa?.headline ? "🇮🇷" : "—";
    console.log(`  ${i.id}  ${i.flag}  ${hasFa}  ${i.headline.slice(0, 65)}`);
  });
  console.log(`\nNext steps:`);
  console.log(`  git add public/data/current-week.json`);
  console.log(`  git commit -m "Publish approved news items"`);
  console.log(`  git push origin main`);
})();

function cleanEntities(s) {
  return s
    .replace(/&#8217;/g, "'").replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, "…").replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
