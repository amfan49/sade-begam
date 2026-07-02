// digest-email.js — generates the weekly HTML email with one-click approve links
//
// Called by GitHub Actions: node agent/digest-email.js > /tmp/digest.html
// Env vars needed: APPROVE_SECRET, SITE_URL

const fs = require("fs");
const path = require("path");

const DRAFT_PATH = path.join(__dirname, "..", "public", "data", "draft-week.json");
const secret = process.env.APPROVE_SECRET || "MISSING_SECRET";
const siteUrl = (process.env.SITE_URL || "https://sade-begam.vercel.app").replace(/\/$/, "");

const draft = JSON.parse(fs.readFileSync(DRAFT_PATH, "utf8"));
const items = draft.items || [];

if (items.length === 0) {
  // Output minimal HTML — workflow checks has_items to skip sending
  process.stdout.write("<p>No draft items today.</p>");
  process.exit(0);
}

const today = new Date().toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });

function approveUrl(id) {
  return `${siteUrl}/api/approve?token=${encodeURIComponent(secret)}&id=${encodeURIComponent(id)}`;
}

function approveAllUrl() {
  return `${siteUrl}/api/approve?token=${encodeURIComponent(secret)}&id=all`;
}

function card(item, index) {
  return `
  <tr>
    <td style="padding:16px 0; border-bottom:1px solid #E8ECF2;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:12px;">
            <div style="font-size:11px; color:#888; margin-bottom:4px;">
              ${index + 1} · ${item.source_organization} · ${item.date} · <em>${item.region}</em>
            </div>
            <div style="font-size:15px; font-weight:600; color:#1C2233; margin-bottom:6px; line-height:1.4;">
              ${item.headline || ""}
            </div>
            <div style="font-size:13px; color:#555; line-height:1.5; margin-bottom:10px;">
              ${(item.excerpt || "").slice(0, 200)}${(item.excerpt || "").length > 200 ? "…" : ""}
            </div>
            <a href="${approveUrl(item.id)}"
               style="display:inline-block; background:#1A6FBF; color:#fff; text-decoration:none;
                      font-size:13px; font-weight:600; padding:8px 18px; border-radius:6px;">
              ✅ منتشر کن — ${item.id}
            </a>
            &nbsp;
            <a href="${item.source_url}" target="_blank"
               style="display:inline-block; color:#1A6FBF; text-decoration:none; font-size:12px; padding:8px 0;">
              🔗 منبع اصلی
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sade Begam — خبرهای جدید برای بررسی</title>
</head>
<body style="margin:0; padding:0; background:#F5F7FA; font-family: Tahoma, Arial, sans-serif; direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA; padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 16px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:#1A6FBF; padding:24px 32px; text-align:center;">
          <div style="color:#fff; font-size:22px; font-weight:700;">Sade Begam</div>
          <div style="color:#C8DEFF; font-size:14px; margin-top:4px;">خبرهای رسمی درباره ایران</div>
        </td>
      </tr>

      <!-- Intro -->
      <tr>
        <td style="padding:24px 32px 8px 32px;">
          <div style="font-size:16px; color:#1C2233; font-weight:600; margin-bottom:4px;">
            ${today} — ${items.length} خبر جدید برای بررسی
          </div>
          <div style="font-size:13px; color:#666; margin-bottom:8px;">
            روی دکمه آبی کلیک کن تا خبر مستقیماً منتشر شود — بدون نیاز به لپ‌تاپ.
          </div>
          <div style="margin-bottom:4px;">
            <a href="${approveAllUrl()}"
               style="display:inline-block; background:#FF6B35; color:#fff; text-decoration:none;
                      font-size:13px; font-weight:700; padding:10px 22px; border-radius:8px;">
              ⚡ انتشار همه ${items.length} خبر با یک کلیک
            </a>
          </div>
          <div style="font-size:11px; color:#aaa; margin-top:6px;">
            یا هر خبر را جداگانه از لیست زیر انتخاب کن:
          </div>
        </td>
      </tr>

      <!-- News items -->
      <tr>
        <td style="padding:8px 32px 16px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${items.map((item, i) => card(item, i)).join("")}
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F5F7FA; padding:16px 32px; text-align:center; border-top:1px solid #E8ECF2;">
          <div style="font-size:11px; color:#999;">
            این ایمیل به‌صورت خودکار از <a href="${siteUrl}" style="color:#1A6FBF;">Sade Begam</a> ارسال می‌شود.
            لینک‌های «منتشر کن» با یک توکن امن محافظت شده‌اند.
          </div>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

process.stdout.write(html);
