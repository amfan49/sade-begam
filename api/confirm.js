// api/confirm.js — Newsletter double opt-in confirmation
// GET /api/confirm?token=...
//
// Marks the matching subscriber as confirmed in public/data/subscribers.json.
// This is the second step of double opt-in — until this link is clicked,
// the subscriber never receives anything but this one confirmation email.

"use strict";

const { readJsonFile, writeJsonFile } = require("./_lib/github");

const SUBSCRIBERS_PATH = "data/subscribers.json"; // not under public/ — real emails live here

function htmlPage(title, msg, color) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    body{margin:0;background:#F5F7FA;display:flex;align-items:center;
         justify-content:center;min-height:100vh;font-family:Tahoma,Arial,sans-serif;}
    .box{background:#fff;border-radius:14px;padding:40px 48px;text-align:center;
         box-shadow:0 4px 24px rgba(0,0,0,.1);max-width:420px;}
    h1{color:${color};margin:0 0 12px;} p{color:#444;line-height:1.6;margin:0 0 18px;}
    a{display:inline-block;background:#1A6FBF;color:#fff;text-decoration:none;
      padding:10px 24px;border-radius:8px;font-size:14px;}
  </style>
</head>
<body><div class="box"><h1>${title}</h1><p>${msg}</p>
<a href="https://sade-begam.vercel.app">→ ساده بگم</a></div></body>
</html>`;
}

module.exports = async (req, res) => {
  const { token } = req.query || {};
  if (!token) return res.status(400).send(htmlPage("خطا", "کد تأیید یافت نشد.", "#e74c3c"));

  const ghPat = process.env.GH_PAT;
  if (!ghPat) return res.status(500).send(htmlPage("خطا", "پیکربندی سرور ناقص است.", "#e74c3c"));

  try {
    const { data, sha } = await readJsonFile(SUBSCRIBERS_PATH, ghPat);
    const store = data || { subscribers: [] };
    const entry = store.subscribers.find((s) => s.confirm_token === token);

    if (!entry) {
      return res.status(404).send(htmlPage("یافت نشد", "این پیوند تأیید معتبر نیست یا قبلاً استفاده شده است.", "#e74c3c"));
    }
    if (entry.confirmed) {
      return res.status(200).send(htmlPage("✅ قبلاً تأیید شده", "اشتراک شما پیش از این تأیید شده بود.", "#27ae60"));
    }

    entry.confirmed = true;
    entry.confirmed_at = new Date().toISOString();
    await writeJsonFile(SUBSCRIBERS_PATH, ghPat, store, sha, `Newsletter confirmed: ${entry.email} [vercel skip]`);

    return res.status(200).send(htmlPage("✅ تأیید شد", "اشتراک شما در خبرنامه‌ی ساده بگم با موفقیت تأیید شد. متشکریم!", "#27ae60"));
  } catch (err) {
    console.error("Confirm error:", err.message);
    return res.status(500).send(htmlPage("خطا", "خطایی رخ داد. لطفاً دوباره تلاش کنید.", "#e74c3c"));
  }
};
