// api/subscribe.js — Newsletter signup with real double opt-in
// POST /api/subscribe
// Body: { email, lang }
//
// Stores the subscriber in public/data/subscribers.json (private repo —
// same GitHub-as-database pattern as api/approve.js, no separate DB needed)
// and emails a confirmation link via Resend. The subscription only becomes
// "confirmed" once the visitor clicks that link (api/confirm.js).
//
// Env vars needed: GH_PAT (already configured), RESEND_API_KEY (free tier)

"use strict";

const crypto = require("crypto");
const { readJsonFile, writeJsonFile } = require("./_lib/github");
const { sendResend } = require("./_lib/resend");

const SITE = "https://sade-begam.vercel.app";
// Deliberately NOT under public/ — that directory is served to every
// visitor as static files, and this file holds real email addresses.
const SUBSCRIBERS_PATH = "data/subscribers.json";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COPY = {
  fa: {
    subject: "ساده بگم — لطفاً اشتراک خبرنامه را تأیید کنید",
    already: "شما پیش‌تر در خبرنامه ثبت‌نام کرده‌اید.",
    body: (link) => `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#1A6FBF;">تأیید اشتراک خبرنامه‌ی ساده بگم</h2>
        <p>سلام،</p>
        <p>برای تکمیل ثبت‌نام در خبرنامه‌ی هفتگی «ساده بگم»، لطفاً روی دکمه‌ی زیر کلیک کنید:</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${link}" style="background:#1A6FBF;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;">تأیید اشتراک</a>
        </p>
        <p style="color:#888;font-size:13px;">اگر این درخواست را شما نفرستاده‌اید، این ایمیل را نادیده بگیرید.</p>
      </div>`
  },
  en: {
    subject: "Sade Begam — please confirm your newsletter subscription",
    already: "You are already subscribed to the newsletter.",
    body: (link) => `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#1A6FBF;">Confirm your Sade Begam newsletter subscription</h2>
        <p>Hello,</p>
        <p>To complete your signup for the Sade Begam weekly newsletter, please click the button below:</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${link}" style="background:#1A6FBF;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;">Confirm subscription</a>
        </p>
        <p style="color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>`
  }
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { email = "", lang = "en" } = req.body || {};
  const cleanEmail = String(email).trim().toLowerCase();
  const L = COPY[lang] || COPY.en;

  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ ok: false, error: "invalid email" });
  }

  const ghPat = process.env.GH_PAT;
  if (!ghPat) {
    return res.status(500).json({ ok: false, error: "GH_PAT not configured" });
  }

  try {
    const { data, sha } = await readJsonFile(SUBSCRIBERS_PATH, ghPat);
    const store = data || { subscribers: [] };

    let entry = store.subscribers.find((s) => s.email === cleanEmail);
    let isNew = false;

    if (entry && entry.confirmed) {
      return res.status(200).json({ ok: true, alreadySubscribed: true, message: L.already });
    }

    if (!entry) {
      isNew = true;
      entry = {
        email: cleanEmail,
        lang: (lang === "fa" ? "fa" : "en"),
        confirm_token: crypto.randomBytes(24).toString("hex"),
        unsubscribe_token: crypto.randomBytes(24).toString("hex"),
        confirmed: false,
        created_at: new Date().toISOString(),
        confirmed_at: null
      };
      store.subscribers.push(entry);
    }

    if (isNew) {
      await writeJsonFile(SUBSCRIBERS_PATH, ghPat, store, sha, `Newsletter signup: ${cleanEmail} [vercel skip]`);
    }

    let emailSent = false;
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const link = `${SITE}/api/confirm?token=${entry.confirm_token}`;
      try {
        await sendResend(apiKey, {
          from: "Sade Begam <onboarding@resend.dev>",
          to: [cleanEmail],
          subject: L.subject,
          html: L.body(link)
        });
        emailSent = true;
      } catch (err) {
        // Resend's free sandbox can only deliver to the account owner's own
        // address until a sending domain is verified — this is expected to
        // fail for real subscribers until that's set up. The signup is still
        // stored so nothing is lost.
        console.error("Resend send failed:", err.message);
      }
    }

    return res.status(200).json({ ok: true, emailSent });
  } catch (err) {
    console.error("Subscribe error:", err.message);
    return res.status(500).json({ ok: false, error: "internal error" });
  }
};
