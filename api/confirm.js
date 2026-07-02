// api/confirm.js — Newsletter double opt-in confirmation
// GET /api/confirm?token=...
//
// Marks the matching subscriber as confirmed in data/subscribers.json
// (repo root — NOT under public/, which is served publicly; that file
// holds real email addresses). This is the second step of double opt-in —
// until this link is clicked, the subscriber never receives anything but
// the one confirmation email.

"use strict";

const { updateJsonFile } = require("./_lib/github");
const { htmlPage } = require("./_lib/html");

const SUBSCRIBERS_PATH = "data/subscribers.json";

module.exports = async (req, res) => {
  const { token } = req.query || {};
  if (!token) return res.status(400).send(htmlPage("خطا", "کد تأیید یافت نشد.", "#e74c3c"));

  const ghPat = process.env.GH_PAT;
  if (!ghPat) return res.status(500).send(htmlPage("خطا", "پیکربندی سرور ناقص است.", "#e74c3c"));

  try {
    const result = await updateJsonFile(SUBSCRIBERS_PATH, ghPat, "Newsletter confirmed [vercel skip]", (data) => {
      const store = data || { subscribers: [] };
      const entry = store.subscribers.find((s) => s.confirm_token === token);
      if (!entry) return { write: false, status: "notfound" };
      if (entry.confirmed) return { write: false, status: "already" };
      entry.confirmed = true;
      entry.confirmed_at = new Date().toISOString();
      return { write: true, data: store, status: "confirmed" };
    });

    if (result.status === "notfound") {
      return res.status(404).send(htmlPage("یافت نشد", "این پیوند تأیید معتبر نیست یا قبلاً استفاده شده است.", "#e74c3c"));
    }
    if (result.status === "already") {
      return res.status(200).send(htmlPage("✅ قبلاً تأیید شده", "اشتراک شما پیش از این تأیید شده بود.", "#27ae60"));
    }
    return res.status(200).send(htmlPage("✅ تأیید شد", "اشتراک شما در خبرنامه‌ی ساده بگم با موفقیت تأیید شد. متشکریم!", "#27ae60"));
  } catch (err) {
    console.error("Confirm error:", err.message);
    return res.status(500).send(htmlPage("خطا", "خطایی رخ داد. لطفاً دوباره تلاش کنید.", "#e74c3c"));
  }
};
