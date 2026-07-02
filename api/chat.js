// api/chat.js — Sade Begam Chatbot Brain
// POST /api/chat
// Body: { messages: [{role, content}], session_id, source, lang }
// Returns: { response: string, session_id: string }
//
// 100% FREE — permanently. No external API, no API key, nothing that can
// ever incur cost. Searches the site's own published news and replies with
// warm, polite, multilingual (fa/en) canned text — the same approach used
// by the in-page chat widget (public/js/chatbot.js) and the full chat page
// fallback (public/js/chat-page.js), so the whole site is consistent.
//
// This is the shared brain for the full chat page (chat.html), the
// embeddable widget (widget.js), and the Telegram bot (api/telegram.js).

"use strict";

const https = require("https");

const SITE = "https://sade-begam.vercel.app";

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, (r) => {
      let data = "";
      r.on("data", (c) => { data += c; });
      r.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

function detectLang(text, hint) {
  if (hint === "fa" || hint === "en") return hint;
  return /[؀-ۿ]/.test(text || "") ? "fa" : "en";
}

function toDigits(n, lang) {
  if (lang !== "fa") return String(n);
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Western sources always listed before Iranian sources.
function sortWesternFirst(items) {
  return [...items].sort((a, b) => {
    const wa = a.country === "Iran" ? 1 : 0;
    const wb = b.country === "Iran" ? 1 : 0;
    if (wa !== wb) return wa - wb;
    return (b.date || "") > (a.date || "") ? 1 : -1;
  });
}

const REPLIES = {
  fa: {
    greeting: "سلام! 👋 خیلی خوش‌آمدید. چه کمکی از دستم برمی‌آید؟",
    help: "با کمال میل کمکتان می‌کنم 🙏\n\n• هر موضوعی را جست‌وجو کنید (مثلاً «آژانس» یا «آلمان»)\n• بنویسید «خبرنامه» برای ثبت‌نام در خبرنامه‌ی رایگان\n• بنویسید «تماس» برای سفارش خبر ویژه\n\nهر وقت خواستید بپرسید.",
    newsletter: `خبرنامه‌ی هفتگیِ رایگان «ساده بگم» اینجاست: ${SITE}/newsletter.html — خوشحال می‌شوم ثبت‌نامتان کنم!`,
    contact: `برای سفارش خبر ویژه یا تماس با ما، لطفاً از این صفحه استفاده کنید: ${SITE}/orders.html`,
    voice: "برای شنیدن اخبار، از دکمه‌ی 🔊 در همین گفت‌وگو یا در کارت‌های خبری صفحه‌ی اصلی استفاده کنید.",
    noData: "با عرض پوزش، در حال حاضر خبری در دسترس نیست. لطفاً کمی بعد دوباره سر بزنید 🙏",
    noResults: (q) => `با عرض پوزش، نتیجه‌ای برای «${q}» پیدا نکردم. می‌توانید در توییتر/ایکس هم جست‌وجو کنید: `,
    found: (n) => `با کمال میل، ${n} نتیجه پیدا کردم:`,
    more: (n) => `و ${n} نتیجه‌ی دیگر هم هست — برای نتیجه‌ی دقیق‌تر، عبارت دیگری را امتحان کنید 🙏`,
    source: "منبع رسمی",
    fallback: 'متشکرم از پیامتان 🙏 من فقط می‌توانم در اخبار رسمی «ساده بگم» جست‌وجو کنم. می‌توانید موضوعی را بپرسید یا بنویسید «راهنما».'
  },
  en: {
    greeting: "Hello! 👋 Welcome. How can I help you today?",
    help: "Happy to help 🙏\n\n• Search any topic (e.g. \"IAEA\" or \"Germany\")\n• Type \"newsletter\" to subscribe to the free newsletter\n• Type \"contact\" to request specific coverage\n\nFeel free to ask anytime.",
    newsletter: `The free Sade Begam weekly newsletter is here: ${SITE}/newsletter.html — I'd be glad to get you signed up!`,
    contact: `To request specific coverage or contact us, please use this page: ${SITE}/orders.html`,
    voice: "To hear the news read aloud, use the 🔊 button in this chat or on the news cards on the home page.",
    noData: "Sorry, no news is available right now. Please check back shortly 🙏",
    noResults: (q) => `Sorry, I couldn't find anything for "${q}". You could also search on Twitter/X: `,
    found: (n) => `Happy to help — I found ${n} result(s):`,
    more: (n) => `Plus ${n} more — try a more specific search term for a better match 🙏`,
    source: "Official source",
    fallback: 'Thank you for your message 🙏 I can only search Sade Begam\'s official news. Please ask about a topic, or type "help".'
  }
};

function twitterUrl(q) {
  return "https://twitter.com/search?q=" + encodeURIComponent("Iran " + q) + "&f=news";
}

async function loadItems() {
  const [week, arc] = await Promise.all([
    fetchJson(`${SITE}/data/current-week.json`),
    fetchJson(`${SITE}/data/archive.json`)
  ]);
  const byId = new Map();
  [...((arc && arc.items) || []), ...((week && week.items) || [])].forEach((it) => {
    if (it && it.id) byId.set(it.id, it);
  });
  return [...byId.values()];
}

function searchReply(query, lang, items) {
  const R = REPLIES[lang];
  const qLow = query.toLowerCase();

  if (!items.length) return { text: R.noData, html: false };

  const iranItems = items.filter((item) => {
    const allText = [
      item.headline, item.excerpt,
      item.translations?.fa?.headline || "", item.translations?.en?.headline || "",
      ...(item.topics || [])
    ].join(" ").toLowerCase();
    return allText.includes("iran") || item.country === "Iran";
  });

  const results = sortWesternFirst(iranItems.filter((item) => {
    const txt = [
      item.country, item.source_organization, item.headline, item.excerpt,
      ...(item.topics || []),
      item.translations?.fa?.headline || "", item.translations?.fa?.excerpt || "",
      item.translations?.en?.headline || "", item.translations?.en?.excerpt || ""
    ].join(" ").toLowerCase();
    return txt.includes(qLow);
  }));

  if (!results.length) {
    return { text: R.noResults(query) + twitterUrl(query), html: false };
  }

  const top = results.slice(0, 3);
  const lines = [R.found(toDigits(results.length, lang))];
  top.forEach((item) => {
    const tr = item.translations?.[lang];
    const headline = (item.lang_original !== lang && tr?.headline) ? tr.headline : item.headline;
    lines.push(`— ${item.country} (${item.source_organization}): ${headline}\n  🔗 ${R.source}: ${item.source_url}`);
  });
  if (results.length > 3) lines.push(R.more(toDigits(results.length - 3, lang)));

  return { text: lines.join("\n\n"), html: false };
}

function routeMessage(query, lang, items) {
  const R = REPLIES[lang];
  const q = query.trim().toLowerCase();

  if (/^(سلام|درود|hello|hi|hey|hallo|bonjour)/.test(q)) return R.greeting;
  if (/^(راهنما|کمک|help|\?|؟)$/.test(q)) return R.help;
  if (/(خبرنامه|newsletter|subscribe|اشتراک)/.test(q)) return R.newsletter;
  if (/(تماس|contact|سفارش|order|درخواست)/.test(q)) return R.contact;
  if (/(بخوان|read.?news|صدا|voice|speak|vorlesen)/.test(q)) return R.voice;
  if (!q) return R.fallback;

  return searchReply(query, lang, items).text;
}

// ── Main handler ─────────────────────────────────────────────────

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { messages = [], session_id, lang: langHint } = req.body || {};
  if (!messages.length) return res.status(400).json({ error: "messages required" });

  const userQuery = messages[messages.length - 1]?.content || "";
  const lang = detectLang(userQuery, langHint);

  try {
    const items = await loadItems();
    const response = routeMessage(userQuery, lang, items);
    return res.json({ response, session_id: session_id || null });
  } catch (err) {
    console.error("Chat error:", err.message);
    const lang2 = detectLang(userQuery, langHint);
    return res.status(200).json({
      response: REPLIES[lang2].fallback,
      session_id: session_id || null
    });
  }
};
