// api/telegram.js — Telegram bot webhook for Sade Begam AI chatbot
// POST /api/telegram
//
// Setup steps:
// 1. Create a bot via @BotFather → get TELEGRAM_BOT_TOKEN
// 2. Set webhook:
//    curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://sade-begam.vercel.app/api/telegram&secret_token=<SECRET>"
// 3. Add env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
//
// The bot forwards every message to /api/chat (the shared brain).

"use strict";

const https = require("https");

const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const WH_SECRET  = process.env.TELEGRAM_WEBHOOK_SECRET;
const CHAT_HOST  = "sade-begam.vercel.app";
const CHAT_PATH  = "/api/chat";

// ── Telegram API ─────────────────────────────────────────────────

function tgSend(chat_id, text) {
  return new Promise((resolve) => {
    if (!BOT_TOKEN) return resolve();
    const body = JSON.stringify({ chat_id, text, parse_mode: "HTML" });
    const req = https.request({
      hostname: "api.telegram.org",
      path:     `/bot${BOT_TOKEN}/sendMessage`,
      method:   "POST",
      headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, (r) => { r.resume(); r.on("end", resolve); });
    req.on("error", () => resolve());
    req.write(body);
    req.end();
  });
}

function tgSendAction(chat_id, action = "typing") {
  return new Promise((resolve) => {
    if (!BOT_TOKEN) return resolve();
    const body = JSON.stringify({ chat_id, action });
    const req = https.request({
      hostname: "api.telegram.org",
      path:     `/bot${BOT_TOKEN}/sendChatAction`,
      method:   "POST",
      headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, (r) => { r.resume(); r.on("end", resolve); });
    req.on("error", () => resolve());
    req.write(body);
    req.end();
  });
}

// ── Forward to Chat Brain ─────────────────────────────────────────

function callChatBrain(messages, session_id) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ messages, session_id, source: "telegram" });
    const req = https.request({
      hostname: CHAT_HOST,
      path:     CHAT_PATH,
      method:   "POST",
      headers:  {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    }, (r) => {
      let data = "";
      r.on("data", c => data += c);
      r.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ response: "خطا در پردازش پاسخ" }); }
      });
    });
    req.on("error", reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error("timeout")); });
    req.write(body);
    req.end();
  });
}

// ── Main handler ─────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  // Verify Telegram secret token
  if (WH_SECRET) {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret !== WH_SECRET) return res.status(403).end();
  }

  res.status(200).end(); // respond immediately so Telegram doesn't retry

  const update = req.body;
  const msg = update?.message || update?.edited_message;
  if (!msg || !msg.text) return;

  const chatId    = String(msg.chat.id);
  const text      = msg.text.trim();
  const sessionId = `tg_${chatId}`;

  // /start command
  if (text === "/start" || text === "/start@" + (process.env.TG_BOT_USERNAME || "")) {
    await tgSend(chatId,
      "سلام! 👋 من <b>بگم‌بات</b> هستم — دستیار سایت «ساده بگم».\n\n" +
      "می‌توانم:\n• اخبار رسمی درباره ایران را برایتان جستجو کنم\n" +
      "• شما را به خبرنامه و صفحه‌های سایت راهنمایی کنم\n\n" +
      "کافی است موضوعی را بنویسید، مثلاً «آژانس» یا «تحریم»."
    );
    return;
  }

  // /help command
  if (text === "/help") {
    await tgSend(chatId,
      "<b>راهنمای بگم‌بات:</b>\n\n" +
      "• هر موضوعی درباره اخبار ایران بنویسید تا جستجو کنم\n" +
      "• بنویسید «خبرنامه» برای پیوند ثبت‌نام در خبرنامه‌ی رایگان\n" +
      "• بنویسید «تماس» برای صفحه‌ی سفارش خبر ویژه\n\n" +
      "🌐 <a href=\"https://sade-begam.vercel.app\">سایت ساده بگم</a>"
    );
    return;
  }

  try {
    await tgSendAction(chatId, "typing");
    const result = await callChatBrain(
      [{ role: "user", content: text }],
      sessionId
    );
    const reply = result.response || "متأسفانه پاسخی دریافت نشد.";
    await tgSend(chatId, reply);
  } catch (err) {
    console.error("Telegram handler error:", err.message);
    await tgSend(chatId, "متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید.");
  }
};
