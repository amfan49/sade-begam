// api/approve.js — Vercel serverless function
// GET /api/approve?token=PASSWORD&id=draft-001
//
// Reads draft-week.json from GitHub, approves the item, commits
// current-week.json directly via GitHub API (as the PAT owner = Amir).
// Vercel GitHub integration sees Amir's commit → auto-deploys.
//
// Env var needed: GH_PAT — GitHub Personal Access Token (workflow scope)

const https  = require("https");
const crypto = require("crypto");
const { htmlPage } = require("./_lib/html");

const REPO    = "amfan49/sade-begam";
const BRANCH  = "main";
const PW_HASH = "680cd13e1975705c243cc562eb06a655cc0d8a5fa872e153f9d347e3f8e5b3a2";

function checkToken(t) {
  if (!t) return false;
  return crypto.createHash("sha256").update(t).digest("hex") === PW_HASH;
}

module.exports = async (req, res) => {
  const { token, id, format } = req.query || {};
  const isJson = format === "json" || id === "__ping__";

  if (!checkToken(token)) {
    return isJson
      ? res.status(403).json({ ok: false, error: "Falsches Passwort" })
      : res.status(403).send(htmlPage("403", "رمز عبور اشتباه است.", "#e74c3c"));
  }

  if (id === "__ping__") return res.status(200).json({ ok: true });

  if (!id || (!id.startsWith("draft-") && id !== "all")) {
    return res.status(400).json({ ok: false, error: "Ungültige ID" });
  }

  const ghPat = process.env.GH_PAT;
  if (!ghPat) {
    return res.status(500).json({ ok: false, error: "GH_PAT fehlt in Vercel Environment Variables" });
  }

  try {
    // 1. Read draft-week.json from GitHub
    const draftFile = await ghGet(`/repos/${REPO}/contents/public/data/draft-week.json`, ghPat);
    const draft = JSON.parse(Buffer.from(draftFile.content, "base64").toString("utf8"));

    // 2. Read current-week.json from GitHub
    const currentFile = await ghGet(`/repos/${REPO}/contents/public/data/current-week.json`, ghPat);
    const current = JSON.parse(Buffer.from(currentFile.content, "base64").toString("utf8"));

    // 3. Find items to approve
    const toApprove = id === "all"
      ? draft.items
      : draft.items.filter(item => item.id === id);

    if (toApprove.length === 0) {
      return res.status(404).json({ ok: false, error: `${id} nicht in der Warteliste gefunden` });
    }

    // 4. Assign new IDs continuing from current-week
    const week = current.week || getISOWeekLabel();
    const existingNums = current.items
      .map(i => parseInt(i.id.split("-").pop(), 10))
      .filter(n => !isNaN(n));
    let nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;

    const added = [];
    for (const item of toApprove) {
      const headline = clean(item.headline || "");
      const excerpt  = clean((item.excerpt || "").replace(/\s*The post .+ appeared first on .+\.$/, "").trim());
      const srcLang  = item.lang_original || "en";

      let faHeadline = null;
      let faExcerpt  = null;
      if (srcLang !== "fa") {
        faHeadline = await translate(headline, srcLang, "fa");
        if (excerpt) faExcerpt = await translate(excerpt, srcLang, "fa");
      }

      added.push({
        id: `${week}-${String(nextNum++).padStart(3, "0")}`,
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
          en: null,
          fa: faHeadline ? { headline: faHeadline, excerpt: faExcerpt || "" } : null
        },
        topics: item.topics || []
      });
    }

    current.items.push(...added);
    current.published_at = new Date().toISOString();
    delete current.is_sample;

    // 5. Commit updated current-week.json via GitHub API
    //    Commit is attributed to the PAT owner (amfan49) → Vercel auto-deploys
    const newContent = Buffer.from(JSON.stringify(current, null, 2)).toString("base64");
    await ghPut(`/repos/${REPO}/contents/public/data/current-week.json`, ghPat, {
      message: `Publish ${id} via AmirCheck`,
      content: newContent,
      sha: currentFile.sha,
      branch: BRANCH
    });

    if (isJson) return res.status(200).json({ ok: true, id, added: added.length });

    return res.status(200).send(htmlPage(
      "✅ منتشر شد",
      `خبر <strong>${id}</strong> منتشر شد.<br>در عرض ۱–۲ دقیقه روی سایت ظاهر می‌شود.`,
      "#27ae60"
    ));

  } catch (err) {
    console.error(err);
    const msg = err.message || "Unbekannter Fehler";
    return isJson
      ? res.status(500).json({ ok: false, error: msg })
      : res.status(500).send(htmlPage("خطا", msg, "#e74c3c"));
  }
};

// ── GitHub API helpers ────────────────────────────────────────────

function ghGet(path, token) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: "api.github.com",
      path,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "sade-begam-approve"
      }
    }, (r) => {
      let data = "";
      r.on("data", c => data += c);
      r.on("end", () => {
        if (r.statusCode !== 200)
          return reject(new Error(`GitHub GET ${path} → ${r.statusCode}`));
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
        "User-Agent": "sade-begam-approve"
      }
    }, (r) => {
      let data = "";
      r.on("data", c => data += c);
      r.on("end", () => {
        if (r.statusCode < 200 || r.statusCode > 299)
          return reject(new Error(`GitHub PUT ${path} → ${r.statusCode}: ${data}`));
        resolve(JSON.parse(data));
      });
    });
    req.on("error", reject);
    req.write(raw);
    req.end();
  });
}

// ── Helpers ───────────────────────────────────────────────────────

function translate(text, from, to) {
  return new Promise((resolve) => {
    if (!text) return resolve(null);
    const q = encodeURIComponent(text.slice(0, 500));
    const url = `/get?q=${q}&langpair=${from}%7C${to}&de=amfan49%40gmail.com`;
    https.get({ hostname: "api.mymemory.translated.net", path: url, timeout: 7000 }, (r) => {
      let raw = "";
      r.on("data", c => raw += c);
      r.on("end", () => {
        try {
          const json = JSON.parse(raw);
          resolve(json.responseStatus === 200 ? json.responseData.translatedText : null);
        } catch { resolve(null); }
      });
    }).on("error", () => resolve(null)).on("timeout", function() { this.destroy(); resolve(null); });
  });
}

function clean(s) {
  return s
    .replace(/&#8217;/g, "'").replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, "…").replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function getISOWeekLabel() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

