// agent/weekly-report.js — builds the subscriber-facing weekly report email
//
// Manual preview: node agent/weekly-report.js > /tmp/report.html
// Used by agent/send-weekly-report.js to build each subscriber's email
// (which fills in a personal unsubscribe link).
//
// Content = official items published in the last 7 days, newest first,
// Western sources before Iranian sources, country name only (no flags).

"use strict";

const fs = require("fs");
const path = require("path");

const SITE = (process.env.SITE_URL || "https://sade-begam.vercel.app").replace(/\/$/, "");
const CURRENT_WEEK_PATH = path.join(__dirname, "..", "public", "data", "current-week.json");

function lastNDaysItems(items, days = 7) {
  const cutoff = Date.now() - days * 86400000;
  return items
    .filter((it) => it.date && new Date(it.date).getTime() >= cutoff)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
      const wa = a.country === "Iran" ? 1 : 0, wb = b.country === "Iran" ? 1 : 0;
      return wa - wb;
    });
}

function itemRow(item, lang) {
  const tr = item.translations ? item.translations[lang] : null;
  const headline = (item.lang_original !== lang && tr && tr.headline) ? tr.headline : item.headline;
  const excerpt = (item.lang_original !== lang && tr && tr.excerpt) ? tr.excerpt : (item.excerpt || "");
  return `
  <tr>
    <td style="padding:16px 0; border-bottom:1px solid #E8ECF2;">
      <div style="font-size:11px; color:#888; margin-bottom:4px;">
        ${item.country} · ${item.source_organization} · ${item.date}
      </div>
      <div style="font-size:15px; font-weight:600; color:#1C2233; margin-bottom:6px; line-height:1.4;">
        ${headline || ""}
      </div>
      <div style="font-size:13px; color:#555; line-height:1.5; margin-bottom:10px;">
        ${(excerpt || "").slice(0, 220)}${(excerpt || "").length > 220 ? "…" : ""}
      </div>
      <a href="${item.source_url}" target="_blank"
         style="display:inline-block; color:#1A6FBF; text-decoration:none; font-size:12px; font-weight:600;">
        🔗 ${lang === "fa" ? "منبع رسمی" : "Official source"}
      </a>
    </td>
  </tr>`;
}

const COPY = {
  fa: {
    dir: "rtl", lang: "fa",
    title: "خبرهای این هفته",
    subtitle: "خبرهای رسمی درباره‌ی ایران — گردآوری‌شده از منابع رسمی",
    empty: "این هفته خبر تازه‌ای منتشر نشد.",
    footer: (unsub) => `این ایمیل چون در خبرنامه‌ی ساده بگم ثبت‌نام کرده‌اید ارسال شده. <a href="${unsub}" style="color:#1A6FBF;">لغو اشتراک</a>`
  },
  en: {
    dir: "ltr", lang: "en",
    title: "This week's news",
    subtitle: "Official news about Iran — gathered from official sources",
    empty: "No new items were published this week.",
    footer: (unsub) => `You're receiving this because you subscribed to the Sade Begam newsletter. <a href="${unsub}" style="color:#1A6FBF;">Unsubscribe</a>`
  }
};

function buildReportHtml(items, lang, unsubscribeUrl) {
  const L = COPY[lang] || COPY.en;
  const weekItems = lastNDaysItems(items, 7);
  const body = weekItems.length
    ? weekItems.map((it) => itemRow(it, L.lang)).join("")
    : `<tr><td style="padding:24px 0; color:#888; font-size:14px;">${L.empty}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="${L.lang}" dir="${L.dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sade Begam — ${L.title}</title>
</head>
<body style="margin:0; padding:0; background:#F5F7FA; font-family: Tahoma, Arial, sans-serif; direction:${L.dir};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA; padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 16px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:#1A6FBF; padding:24px 32px; text-align:center;">
          <div style="color:#fff; font-size:22px; font-weight:700;">Sade Begam</div>
          <div style="color:#C8DEFF; font-size:14px; margin-top:4px;">${L.subtitle}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 4px 32px;">
          <div style="font-size:16px; color:#1C2233; font-weight:600;">${L.title}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 32px 16px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">${body}</table>
        </td>
      </tr>
      <tr>
        <td style="background:#F5F7FA; padding:16px 32px; text-align:center; border-top:1px solid #E8ECF2;">
          <div style="font-size:11px; color:#999;">
            <a href="${SITE}" style="color:#1A6FBF;">sade-begam.vercel.app</a> — ${L.footer(unsubscribeUrl)}
          </div>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// Manual preview run
if (require.main === module) {
  const data = JSON.parse(fs.readFileSync(CURRENT_WEEK_PATH, "utf8"));
  const lang = process.env.LANG_PREVIEW === "en" ? "en" : "fa";
  process.stdout.write(buildReportHtml(data.items || [], lang, `${SITE}/api/unsubscribe?token=PREVIEW`));
}

module.exports = { buildReportHtml, lastNDaysItems };
