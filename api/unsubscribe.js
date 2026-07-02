// api/unsubscribe.js — one-click unsubscribe (link included in every
// confirmation and weekly report email)
// GET /api/unsubscribe?token=...
//
// Removes the matching subscriber from data/subscribers.json entirely
// (repo root — NOT under public/, which is served publicly).

"use strict";

const { updateJsonFile } = require("./_lib/github");
const { htmlPage } = require("./_lib/html");

const SUBSCRIBERS_PATH = "data/subscribers.json";

module.exports = async (req, res) => {
  const { token } = req.query || {};
  if (!token) return res.status(400).send(htmlPage("خطا", "کد لغو اشتراک یافت نشد.", "#e74c3c"));

  const ghPat = process.env.GH_PAT;
  if (!ghPat) return res.status(500).send(htmlPage("خطا", "پیکربندی سرور ناقص است.", "#e74c3c"));

  try {
    const result = await updateJsonFile(SUBSCRIBERS_PATH, ghPat, "Newsletter unsubscribe [vercel skip]", (data) => {
      const store = data || { subscribers: [] };
      const before = store.subscribers.length;
      store.subscribers = store.subscribers.filter((s) => s.unsubscribe_token !== token);
      if (store.subscribers.length === before) return { write: false, removed: false };
      return { write: true, data: store, removed: true };
    });

    if (!result.removed) {
      return res.status(200).send(htmlPage("لغو شد", "این اشتراک قبلاً لغو شده بود.", "#27ae60"));
    }
    return res.status(200).send(htmlPage("✅ لغو اشتراک شد", "دیگر ایمیلی از خبرنامه‌ی ساده بگم دریافت نخواهید کرد.", "#27ae60"));
  } catch (err) {
    console.error("Unsubscribe error:", err.message);
    return res.status(500).send(htmlPage("خطا", "خطایی رخ داد. لطفاً دوباره تلاش کنید.", "#e74c3c"));
  }
};
