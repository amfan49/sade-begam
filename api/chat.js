// api/chat.js — Sade Begam AI Chatbot Brain
// POST /api/chat
// Body: { messages: [{role, content}], session_id, source }
// Returns: { response: string, session_id: string }
//
// Env vars needed:
//   ANTHROPIC_API_KEY   — Claude API key (required)
//   SUPABASE_URL        — https://xxxx.supabase.co (optional: enables memory + RAG)
//   SUPABASE_SERVICE_KEY — service role key (optional)

"use strict";

const SYSTEM_PROMPT = `تو «بگم‌بات» هستی — دستیار هوشمند فارسی‌زبان سایت «ساده بگم».

ساده بگم یک رسانه‌ی مستقل است که اظهارات رسمی درباره‌ی ایران را از منابع معتبر بین‌المللی
جمع‌آوری و ترجمه می‌کند. هیچ تحلیل، تفسیر یا نظر شخصی ارائه نمی‌دهد — فقط منابع رسمی.

وظایف تو:
• پاسخ به سؤالات درباره اخبار و اظهارات رسمی
• راهنمایی درباره سایت و نحوه استفاده
• ثبت اطلاعات تماس افراد علاقه‌مند (ابزار capture_lead)
• بررسی وضعیت ثبت‌نام/اشتراک (ابزار check_enrollment)

قوانین مهم:
• همیشه به فارسی پاسخ بده مگر اینکه کاربر به زبان دیگری بنویسد
• مؤدب، دقیق و مختصر باش — پاسخ‌های طولانی غیرضروری ممنوع
• فقط اطلاعات دقیق ارائه بده؛ اگر نمی‌دانی صادقانه بگو
• برای جمع‌آوری لید، نام و ایمیل را از کاربر بخواه`;

const TOOLS = [
  {
    name: "capture_lead",
    description: "اطلاعات تماس کاربر را ذخیره کن. وقتی کاربر می‌خواهد تماس گرفته شود، اشتراک بگیرد یا اطلاعات بیشتری بگیرد از این ابزار استفاده کن.",
    input_schema: {
      type: "object",
      properties: {
        name:  { type: "string", description: "نام کامل کاربر" },
        email: { type: "string", description: "آدرس ایمیل" },
        phone: { type: "string", description: "شماره تلفن (اختیاری)" },
        note:  { type: "string", description: "موضوع علاقه یا یادداشت" }
      },
      required: ["name", "email"]
    }
  },
  {
    name: "check_enrollment",
    description: "وضعیت ثبت‌نام یا اشتراک کاربر را بررسی کن",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "ایمیل کاربر برای جستجو" }
      },
      required: ["email"]
    }
  }
];

// ── Supabase REST helpers ─────────────────────────────────────────

function sbHeaders(key) {
  return {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
  };
}

async function sbSelect(url, key, table, params) {
  const u = new URL(`${url}/rest/v1/${table}`);
  Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, v));
  try {
    const r = await fetch(u.toString(), { headers: sbHeaders(key) });
    if (!r.ok) return [];
    return r.json();
  } catch { return []; }
}

async function sbInsert(url, key, table, data) {
  try {
    await fetch(`${url}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...sbHeaders(key), "Prefer": "return=minimal" },
      body: JSON.stringify(data)
    });
  } catch { /* non-critical */ }
}

async function sbRpc(url, key, fn, params) {
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: sbHeaders(key),
      body: JSON.stringify(params)
    });
    if (!r.ok) return [];
    return r.json();
  } catch { return []; }
}

// ── Claude API call ───────────────────────────────────────────────

async function callClaude(messages, system, tools, apiKey) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system,
      messages,
      tools
    })
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Claude API ${r.status}: ${txt.slice(0, 200)}`);
  }
  return r.json();
}

// ── Tool execution ────────────────────────────────────────────────

async function executeTool(name, input, sessionId, sbUrl, sbKey, source) {
  if (name === "capture_lead") {
    if (sbUrl && sbKey) {
      await sbInsert(sbUrl, sbKey, "leads", {
        name:       input.name,
        email:      input.email,
        phone:      input.phone || null,
        note:       input.note  || null,
        source:     `chatbot-${source || "web"}`,
        session_id: sessionId || null
      });
    }
    return `لید ثبت شد: ${input.name} <${input.email}>`;
  }

  if (name === "check_enrollment") {
    if (!sbUrl || !sbKey) return "سیستم پایگاه داده در دسترس نیست";
    const rows = await sbSelect(sbUrl, sbKey, "enrollments", {
      "email": `eq.${input.email}`,
      "limit": "1"
    });
    if (!rows.length) return "ثبت‌نامی با این ایمیل یافت نشد";
    const e = rows[0];
    return `name=${e.name};course=${e.course};status=${e.status}`;
  }

  return "ابزار نامشخص";
}

// ── Main handler ─────────────────────────────────────────────────

module.exports = async (req, res) => {
  // CORS — allow widget to work on any domain
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { messages = [], session_id, source = "web" } = req.body || {};
  if (!messages.length) return res.status(400).json({ error: "messages required" });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;

  try {
    // 1. Long-term memory: load previous conversation
    let history = [];
    if (sbUrl && sbKey && session_id) {
      const prev = await sbSelect(sbUrl, sbKey, "chat_messages", {
        "session_id": `eq.${session_id}`,
        "order":      "created_at.asc",
        "limit":      "20",
        "select":     "role,content"
      });
      history = (prev || []).map(r => ({ role: r.role, content: r.content }));
    }

    // 2. RAG: search relevant news
    const userQuery = messages[messages.length - 1]?.content || "";
    let ragContext = "";
    if (sbUrl && sbKey && userQuery.trim()) {
      const docs = await sbRpc(sbUrl, sbKey, "search_news", {
        query_text:  userQuery,
        match_count: 3
      });
      if (Array.isArray(docs) && docs.length) {
        ragContext = "\n\nاخبار مرتبط در پایگاه داده:\n" +
          docs.map(d =>
            `- [${d.date}] ${d.source_organization}: ${d.headline}`
          ).join("\n");
      }
    }

    // 3. Build full message list (history + new messages, max 30)
    const allMessages = [...history, ...messages].slice(-30);
    const systemWithRag = SYSTEM_PROMPT + ragContext;

    // 4. First Claude call
    const resp1 = await callClaude(allMessages, systemWithRag, TOOLS, apiKey);

    let finalText = "";

    if (resp1.stop_reason === "tool_use") {
      // 5a. Execute tools + continue conversation
      const toolUseBlocks = resp1.content.filter(b => b.type === "tool_use");
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (b) => ({
          type:        "tool_result",
          tool_use_id: b.id,
          content:     await executeTool(b.name, b.input, session_id, sbUrl, sbKey, source)
        }))
      );

      const continueMessages = [
        ...allMessages,
        { role: "assistant", content: resp1.content },
        { role: "user",      content: toolResults }
      ];
      const resp2 = await callClaude(continueMessages, systemWithRag, TOOLS, apiKey);
      finalText = resp2.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");
    } else {
      // 5b. Direct text response
      finalText = resp1.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");
    }

    // 6. Save to long-term memory
    if (sbUrl && sbKey && session_id && finalText) {
      await sbInsert(sbUrl, sbKey, "chat_messages", [
        { session_id, role: "user",      content: userQuery, source },
        { session_id, role: "assistant", content: finalText,  source }
      ]);
    }

    return res.json({ response: finalText, session_id: session_id || null });

  } catch (err) {
    console.error("Chat error:", err.message);
    return res.status(500).json({
      response: "متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید.",
      error:    err.message
    });
  }
};
