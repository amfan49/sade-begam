// ── Sade Begam — Instagram daily-summary generator ────────────────
// Reads public/data/current-week.json and produces, in this folder:
//   • post-latest.html   — a self-contained 1080×1080 card (open + screenshot)
//   • caption-latest.txt — a ready Instagram caption (Persian headlines)
//
// Design is fixed and neutral, on-brand (blue #1A6FBF, orange #FF6B35,
// Vazirmatn). Every image carries today's Gregorian date (day month) and a
// link back to the site for the full translation. No paid APIs.
//
// Run:  node social/generate-instagram.js   (optionally MAX=5)

const fs = require("fs");
const path = require("path");

const MAX = Number(process.env.MAX || 5);
const SITE = "sadebegam.com";
const dataPath = path.join(__dirname, "..", "public", "data", "current-week.json");

// ── Dates ──────────────────────────────────────────────────────────
const MONTHS_EN = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const faDigits = (s) => String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

function toJalali(gy, gm, gd) {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

const today = new Date();
const gregToday = `${today.getDate()} ${MONTHS_EN[today.getMonth()]}`;
const jt = toJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
const jalaliToday = `${faDigits(jt.jd)} ${JALALI_MONTHS[jt.jm - 1]}`;

// ── Load data ──────────────────────────────────────────────────────
let items = [];
try {
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  items = (data.items || []).slice(0, MAX).map((it) => {
    const fa = it.translations && it.translations.fa ? it.translations.fa.headline : null;
    return { flag: it.flag || "🏳️", headline: fa || it.headline || "", country: it.country || "" };
  });
} catch (e) {
  console.error("Could not read current-week.json:", e.message);
  process.exit(1);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ── 1080×1080 card (self-contained, screenshot-ready) ──────────────
const rows = items.map((it) => `
      <li class="row">
        <span class="row__flag">${it.flag}</span>
        <span class="row__text">${esc(it.headline)}</span>
      </li>`).join("");

const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>Sade Begam — Daily summary ${gregToday}</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&family=Outfit:wght@600;700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #4a4a4a; display: flex; justify-content: center; padding: 40px; }
  .card {
    width: 1080px; height: 1080px; background: #F5F7FA;
    font-family: 'Vazirmatn', sans-serif; color: #1C2233;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .head {
    background: #1C2233; color: #fff; padding: 54px 64px 40px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .brand { display: flex; align-items: center; gap: 20px; }
  .mark {
    width: 76px; height: 76px; border-radius: 18px; background: #1A6FBF;
    color: #fff; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 32px;
    display: flex; align-items: center; justify-content: center;
  }
  .brand__name { font-size: 40px; font-weight: 700; }
  .brand__tag { font-size: 19px; color: #4A8FB8; margin-top: 4px; }
  .date { text-align: left; }
  .date__greg { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 34px; color: #FF6B35; }
  .date__fa { font-size: 22px; color: #B8BCC6; margin-top: 4px; }
  .kicker {
    background: #1A6FBF; color: #fff; text-align: center;
    font-size: 24px; font-weight: 600; padding: 18px;
  }
  .body { flex: 1; padding: 44px 64px; display: flex; flex-direction: column; justify-content: center; }
  .row {
    list-style: none; display: flex; gap: 22px; align-items: flex-start;
    padding: 24px 0; border-bottom: 1px solid #D0D8EC;
  }
  .row:last-child { border-bottom: none; }
  .row__flag { font-size: 46px; line-height: 1.1; flex-shrink: 0; }
  .row__text { font-size: 33px; font-weight: 600; line-height: 1.5; }
  .foot {
    background: #1C2233; color: #fff; padding: 36px 64px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .foot__cta { font-size: 26px; font-weight: 600; }
  .foot__cta span { color: #FF6B35; }
  .foot__site { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 700; color: #4A8FB8; }
</style>
</head>
<body>
  <div class="card">
    <div class="head">
      <div class="brand">
        <div class="mark">SB</div>
        <div>
          <div class="brand__name">ساده بگم</div>
          <div class="brand__tag">خبر رسمی. بدون فیلتر.</div>
        </div>
      </div>
      <div class="date">
        <div class="date__greg">${gregToday}</div>
        <div class="date__fa">${jalaliToday}</div>
      </div>
    </div>
    <div class="kicker">خبرهای رسمی امروز درباره‌ی ایران</div>
    <ul class="body">${rows}
    </ul>
    <div class="foot">
      <div class="foot__cta">ترجمه‌ی کامل و منبع رسمی در <span>وب‌سایت</span></div>
      <div class="foot__site">${SITE}</div>
    </div>
  </div>
</body>
</html>`;

// ── Caption ────────────────────────────────────────────────────────
const captionLines = items.map((it) => `${it.flag} ${it.headline}`).join("\n\n");
const caption = `خبرهای رسمی امروز درباره‌ی ایران — ${gregToday} / ${jalaliToday}

${captionLines}

🔗 ترجمه‌ی کامل و منبع رسمی هر خبر در وب‌سایت: ${SITE}

ما خبر را می‌رسانیم. نتیجه‌گیری با شماست.
#ایران #خبر_رسمی #ساده_بگم`;

fs.writeFileSync(path.join(__dirname, "post-latest.html"), html);
fs.writeFileSync(path.join(__dirname, "caption-latest.txt"), caption);

console.log(`✓ ${items.length} headline(s) for ${gregToday}`);
console.log("  → social/post-latest.html   (open in a browser, screenshot the 1080×1080 card)");
console.log("  → social/caption-latest.txt (copy as the Instagram caption)");
