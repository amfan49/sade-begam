// api/contact.js — Impressum contact form
// POST /api/contact
// Body: { name, email, message }
//
// Emails the visitor's message to the site operator (amfan49@gmail.com) via
// Resend. The visitor's address is used only as the Reply-To header — it is
// never stored, forwarded elsewhere, or shown to any third party.
//
// Env var needed: RESEND_API_KEY (free tier: resend.com)

"use strict";

const { sendResend } = require("./_lib/resend");

const OPERATOR_EMAIL = "amfan49@gmail.com";

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { name = "", email = "", message = "" } = req.body || {};
  if (!email || !message) {
    return res.status(400).json({ ok: false, error: "email and message are required" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: "RESEND_API_KEY not configured" });
  }

  try {
    await sendResend(apiKey, {
      from: "Sade Begam Contact Form <onboarding@resend.dev>",
      to: [OPERATOR_EMAIL],
      reply_to: email,
      subject: `Sade Begam — Contact form message${name ? " from " + name : ""}`,
      html: `<p><strong>Name:</strong> ${escapeHtml(name) || "(not given)"}</p>
             <p><strong>Email:</strong> ${escapeHtml(email)}</p>
             <p><strong>Message:</strong></p>
             <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Contact form error:", err.message);
    return res.status(502).json({ ok: false, error: "send failed" });
  }
};
