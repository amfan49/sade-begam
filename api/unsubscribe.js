// api/unsubscribe.js — one-click unsubscribe (link included in every
// confirmation and weekly report email)
// GET /api/unsubscribe?token=...
//
// Removes the matching subscriber from data/subscribers.json entirely.

"use strict";

const { readJsonFile, writeJsonFile } = require("./_lib/github");

const SUBSCRIBERS_PATH = "data/subscribers.json";

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
  if (!token) return res.status(400).send(htmlPage("خطا", "کد لغو اشتراک یافت نشد.", "#e74c3c"));

  const ghPat = process.env.GH_PAT;
  if (!ghPat) return res.status(500).send(htmlPage("خطا", "پیکربندی سرور ناقص است.", "#e74c3c"));

  try {
    const { data, sha } = await readJsonFile(SUBSCRIBERS_PATH, ghPat);
    const store = data || { subscribers: [] };
    const before = store.subscribers.length;
    store.subscribers = store.subscribers.filter((s) => s.unsubscribe_token !== token);

    if (store.subscribers.length === before) {
      return res.status(200).send(htmlPage("لغو شد", "این اشتراک قبلاً لغو شده بود.", "#27ae60"));
    }

    await writeJsonFile(SUBSCRIBERS_PATH, ghPat, store, sha, "Newsletter unsubscribe [vercel skip]");
    return res.status(200).send(htmlPage("✅ لغو اشتراک شد", "دیگر ایمیلی از خبرنامه‌ی ساده بگم دریافت نخواهید کرد.", "#27ae60"));
  } catch (err) {
    console.error("Unsubscribe error:", err.message);
    return res.status(500).send(htmlPage("خطا", "خطایی رخ داد. لطفاً دوباره تلاش کنید.", "#e74c3c"));
  }
};
