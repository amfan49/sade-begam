// agent/send-weekly-report.js — sends the weekly report to newsletter subscribers
//
// Run by .github/workflows/weekly-report.yml (Sunday, after weekly-update.yml).
//
// SAFETY: defaults to TEST_ONLY — sends a single preview to Amir's own inbox
// instead of the real subscriber list. This is intentional: Amir asked to
// review a sample email before this goes live for real subscribers. Once
// he's happy with a preview, flip TEST_ONLY to "false" in the workflow.
//
// Env vars needed: RESEND_API_KEY, TEST_ONLY ("true"/"false")

"use strict";

const fs = require("fs");
const path = require("path");
const { buildReportHtml } = require("./weekly-report");
// Runs from a full repo checkout in GitHub Actions, so the serverless
// helper is requirable here too — one Resend client, not two.
const { sendResend } = require("../api/_lib/resend");

const SITE = (process.env.SITE_URL || "https://sade-begam.vercel.app").replace(/\/$/, "");
const OWNER_EMAIL = "amfan49@gmail.com";
const TEST_ONLY = process.env.TEST_ONLY !== "false"; // default true — safest

const CURRENT_WEEK_PATH = path.join(__dirname, "..", "public", "data", "current-week.json");
const SUBSCRIBERS_PATH = path.join(__dirname, "..", "data", "subscribers.json");

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("RESEND_API_KEY not set — skipping weekly report send.");
    return;
  }

  const week = JSON.parse(fs.readFileSync(CURRENT_WEEK_PATH, "utf8"));
  const items = week.items || [];

  if (TEST_ONLY) {
    const html = buildReportHtml(items, "fa", `${SITE}/api/unsubscribe?token=PREVIEW`);
    await sendResend(apiKey, {
      from: "Sade Begam <onboarding@resend.dev>",
      to: [OWNER_EMAIL],
      subject: "📰 [PREVIEW] Sade Begam — Weekly report test send",
      html: `<p style="background:#FFF3E0;color:#BF5000;padding:10px 16px;border-radius:8px;font-family:sans-serif;font-size:13px;">
               This is a TEST preview only — sent to you, not to real subscribers.
               Set TEST_ONLY=false in weekly-report.yml once you're happy with it.
             </p>` + html
    });
    console.log("Test preview sent to", OWNER_EMAIL);
    return;
  }

  if (!fs.existsSync(SUBSCRIBERS_PATH)) {
    console.log("No subscribers.json found — nothing to send.");
    return;
  }
  const store = JSON.parse(fs.readFileSync(SUBSCRIBERS_PATH, "utf8"));
  const confirmed = (store.subscribers || []).filter((s) => s.confirmed);

  if (!confirmed.length) {
    console.log("No confirmed subscribers — nothing to send.");
    return;
  }

  for (const sub of confirmed) {
    const lang = sub.lang === "fa" ? "fa" : "en";
    const unsubscribeUrl = `${SITE}/api/unsubscribe?token=${sub.unsubscribe_token}`;
    const html = buildReportHtml(items, lang, unsubscribeUrl);
    const subject = lang === "fa" ? "📰 ساده بگم — خبرهای این هفته" : "📰 Sade Begam — This week's news";
    try {
      await sendResend(apiKey, { from: "Sade Begam <onboarding@resend.dev>", to: [sub.email], subject, html });
      console.log("Sent to", sub.email);
    } catch (err) {
      console.error("Failed to send to", sub.email, "-", err.message);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
