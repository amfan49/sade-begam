// ── Sade Begam — AI Chat page ─────────────────────────────────
// Full chat interface for /chat.html
// Uses /api/chat (the shared brain) — requires ANTHROPIC_API_KEY on Vercel
// Falls back to local news search when API is not available.

const CHAT_API   = "/api/chat";
const SESSION_KEY = "sb_chat_session_v1";
const HISTORY_KEY = "sb_chat_history_v1";
const MAX_LOCAL   = 60; // messages to keep in localStorage

// Session ID persists across page reloads (not across devices)
function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = "web_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

let SESSION_ID = getSessionId();
let IS_SENDING = false;

// ── DOM refs ──────────────────────────────────────────────────

const messagesEl    = document.getElementById("chatMessages");
const inputEl       = document.getElementById("chatInput");
const sendBtn       = document.getElementById("chatSend");
const suggestionsEl = document.getElementById("chatSuggestions");

// ── i18n apply ────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  applyChrome();
  initChat();
});

function applyChrome() {
  document.documentElement.lang = T.htmlLang;
  document.documentElement.dir  = T.dir;
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  set("brandName",   T.brandName);
  set("tagline",     T.tagline);
  set("navHome",     T.navHome);
  set("navAbout",    T.navAbout);
  set("navArchive",  T.navArchive);
  set("navNewsletter", T.navNewsletter);
  set("navOrders",   T.navOrders);
  set("navChat",     T.navChat || "AI Chat");
  set("chatBotName",   T.aiChat?.botName   || "بگم‌بات");
  set("chatBotStatus", T.aiChat?.botStatus || "آنلاین · دستیار هوشمند");

  if (inputEl) {
    inputEl.placeholder = T.aiChat?.placeholder || "پیامتان را بنویسید…";
    inputEl.setAttribute("dir", T.dir);
  }
  document.querySelectorAll("[data-setlang]").forEach(btn => {
    if (btn.dataset.setlang === SB_LANG) btn.classList.add("active");
    btn.addEventListener("click", () => setLang(btn.dataset.setlang));
  });
  sbRenderCommonFooter && sbRenderCommonFooter();
}

// ── Init ──────────────────────────────────────────────────────

function initChat() {
  buildSuggestionChips();

  const saved = loadLocalHistory();
  if (saved.length) {
    saved.forEach(m => appendBubble(m.role, m.text, false));
    hideSuggestions();
  } else {
    showGreeting();
  }

  inputEl.addEventListener("input", () => {
    autoResize(inputEl);
    sendBtn.disabled = !inputEl.value.trim() || IS_SENDING;
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) doSend();
    }
  });

  sendBtn.addEventListener("click", doSend);
}

function buildSuggestionChips() {
  if (!suggestionsEl) return;
  const suggestions = T.aiChat?.suggestions || [];
  suggestionsEl.innerHTML = "";
  suggestions.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "chat-suggestions__chip";
    btn.dataset.q = s.q;
    btn.textContent = s.label;
    btn.addEventListener("click", () => sendMessage(s.q));
    suggestionsEl.appendChild(btn);
  });
}

function showGreeting() {
  const greeting = T.aiChat?.greeting || "سلام! 👋";
  appendBubble("bot", greeting, false);
}

// ── Send flow ─────────────────────────────────────────────────

function doSend() {
  const text = inputEl.value.trim();
  if (!text || IS_SENDING) return;
  sendMessage(text);
}

async function sendMessage(text) {
  hideSuggestions();
  appendBubble("user", text);
  saveToHistory("user", text);
  inputEl.value = "";
  autoResize(inputEl);
  sendBtn.disabled = true;
  IS_SENDING = true;

  const typingEl = showTyping();

  try {
    // Build conversation history for context (last 10 turns)
    const history = loadLocalHistory()
      .slice(-10)
      .filter(m => m.text !== text) // exclude the message we just added
      .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));

    const res = await fetch(CHAT_API, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        messages:   [...history, { role: "user", content: text }],
        session_id: SESSION_ID,
        source:     "web"
      })
    });

    const data = await res.json();
    removeTyping(typingEl);

    // If API unavailable (no key, server error), fall back to local search
    if (res.status === 503 || !res.ok || !data.response) {
      handleLocalFallback(text);
      return;
    }

    const reply = data.response;
    appendBubble("bot", reply);
    saveToHistory("bot", reply);
  } catch (_) {
    removeTyping(typingEl);
    handleLocalFallback(text);
  } finally {
    IS_SENDING = false;
    sendBtn.disabled = !inputEl.value.trim();
    inputEl.focus();
  }
}

// ── Local search fallback (when API key not set) ──────────────

function _getLocalNews() {
  try {
    const cw  = JSON.parse(localStorage.getItem("sb_current_week_v1"));
    const items = (cw?.data?.items || []).slice();
    const arc = JSON.parse(localStorage.getItem("sb_archive_v1"));
    const arcItems = arc?.items || arc?.data?.items || [];
    const ids = new Set(items.map(i => i.id));
    arcItems.forEach(i => { if (i && !ids.has(i.id)) items.push(i); });
    return items;
  } catch { return []; }
}

function _escHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function handleLocalFallback(query) {
  const chat = T.aiChat || {};
  const q    = query.toLowerCase();
  const lang = SB_LANG;

  // Greetings
  if (/^(سلام|درود|hello|hi|hey|hallo)/.test(q)) {
    const reply = T.chat?.greetBack || (lang === "fa" ? "سلام! چه کمکی می‌توانم بکنم؟" : "Hello! How can I help?");
    appendBubble("bot", reply);
    saveToHistory("bot", reply);
    return;
  }

  // Newsletter
  if (/(خبرنامه|newsletter|subscribe|اشتراک)/.test(q)) {
    const reply = (lang === "fa")
      ? "خبرنامه‌ی ساده بگم هنوز فعال نشده — می‌توانید ایمیل خود را در صفحه‌ی خبرنامه ثبت کنید تا اول از همه باخبر شوید: newsletter.html"
      : "The Sade Begam newsletter is not yet active — register your email on the newsletter page to be the first notified: newsletter.html";
    appendBubble("bot", reply);
    saveToHistory("bot", reply);
    return;
  }

  // Contact / Orders
  if (/(تماس|contact|سفارش|order|درخواست)/.test(q)) {
    const reply = (lang === "fa")
      ? "برای سفارش خبر ویژه یا تماس با ما، از صفحه‌ی سفارش خبر استفاده کنید: orders.html"
      : "To order specific news coverage or contact us, visit the orders page: orders.html";
    appendBubble("bot", reply);
    saveToHistory("bot", reply);
    return;
  }

  // News search
  const items = _getLocalNews();
  if (!items.length) {
    const reply = (lang === "fa")
      ? "داده‌ای در حافظه نیست. لطفاً ابتدا صفحه‌ی اصلی را باز کنید."
      : "No local news data. Please visit the home page first.";
    appendBubble("bot", reply);
    saveToHistory("bot", reply);
    return;
  }

  appendBubble("bot", chat.localMode || (lang === "fa" ? "🔍 نتایج جستجوی محلی:" : "🔍 Local search results:"), false);

  const results = items.filter(item => {
    const txt = [
      item.headline, item.excerpt, item.country, item.source_organization,
      ...(item.topics || []),
      item.translations?.fa?.headline || "",
      item.translations?.en?.headline || "",
    ].join(" ").toLowerCase();
    return txt.includes(q);
  });

  if (!results.length) {
    const noRes = (lang === "fa")
      ? `نتیجه‌ای برای «${_escHtml(query)}» یافت نشد.`
      : `No results for "${_escHtml(query)}".`;
    appendBubble("bot", noRes, false);
    saveToHistory("bot", noRes);
    return;
  }

  const top = results.slice(0, 3);
  top.forEach(item => {
    const tr = item.translations?.[lang];
    const hasTr = item.lang_original !== lang && tr?.headline;
    const dateStr = typeof sbBothDates !== "undefined" ? sbBothDates(item.date) : (item.date || "");
    const html = `<div style="background:var(--bg-page);border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.55;margin-top:4px;">
      <div style="display:flex;align-items:center;gap:6px;font-weight:700;margin-bottom:4px;">
        <span>${item.flag || "🌍"}</span>
        <strong>${_escHtml(item.country)}</strong>
        <span style="font-size:11px;color:var(--text-muted);font-weight:400;">${_escHtml(dateStr)}</span>
      </div>
      <div style="color:var(--text-body);margin-bottom:4px;" lang="${item.lang_original}" dir="${item.lang_original === "fa" ? "rtl" : "ltr"}">${_escHtml(item.headline)}</div>
      ${hasTr ? `<div style="color:var(--brand-blue-deep);font-style:italic;margin-bottom:6px;">${_escHtml(tr.headline)}</div>` : ""}
      <a href="${_escHtml(item.source_url)}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background:var(--brand-blue);color:#fff;text-decoration:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;margin-top:4px;">
        🔗 ${lang === "fa" ? "منبع رسمی" : "Official Source"}
      </a>
    </div>`;
    appendBubbleHTML(html);
  });

  if (results.length > 3) {
    const more = results.length - 3;
    const moreStr = (lang === "fa")
      ? `+${typeof sbPersianDigits !== "undefined" ? sbPersianDigits(more) : more} نتیجه‌ی دیگر.`
      : `+${more} more result(s).`;
    appendBubble("bot", moreStr, false);
  }

  const summary = top.map(i => `${i.flag} ${i.headline} — ${i.source_url}`).join("\n");
  saveToHistory("bot", summary);
}

// ── Render helpers ────────────────────────────────────────────

function appendBubble(role, text, scroll = true) {
  const isBot  = role === "bot" || role === "assistant";
  const wrap   = document.createElement("div");
  wrap.className = "msg " + (isBot ? "msg--bot" : "msg--user");

  const avatar = document.createElement("div");
  avatar.className = "msg__avatar";
  avatar.textContent = isBot ? "🤖" : "👤";

  const bubble = document.createElement("div");
  bubble.className = "msg__bubble";
  bubble.textContent = text;

  const time = document.createElement("div");
  time.className = "msg__time";
  time.textContent = nowTime();

  const inner = document.createElement("div");
  inner.style.cssText = "display:flex;flex-direction:column;gap:2px;max-width:100%";
  inner.appendChild(bubble);
  inner.appendChild(time);

  wrap.appendChild(avatar);
  wrap.appendChild(inner);
  messagesEl.appendChild(wrap);

  if (scroll) messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendBubbleHTML(html) {
  const wrap = document.createElement("div");
  wrap.className = "msg msg--bot";

  const avatar = document.createElement("div");
  avatar.className = "msg__avatar";
  avatar.textContent = "🤖";

  const inner = document.createElement("div");
  inner.style.cssText = "display:flex;flex-direction:column;gap:2px;max-width:100%";
  inner.innerHTML = html;

  wrap.appendChild(avatar);
  wrap.appendChild(inner);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping() {
  const wrap = document.createElement("div");
  wrap.className = "msg msg--bot";
  wrap.id = "sbTyping";

  const avatar = document.createElement("div");
  avatar.className = "msg__avatar";
  avatar.textContent = "🤖";

  const dots = document.createElement("div");
  dots.className = "typing-indicator";
  dots.innerHTML = "<span></span><span></span><span></span>";

  wrap.appendChild(avatar);
  wrap.appendChild(dots);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return wrap;
}

function removeTyping(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function hideSuggestions() {
  if (suggestionsEl) suggestionsEl.style.display = "none";
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

function nowTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2, "0") + ":" +
         d.getMinutes().toString().padStart(2, "0");
}

// ── Local history (visual only — long-term memory is in Supabase) ─

function loadLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch { return []; }
}

function saveToHistory(role, text) {
  try {
    const h = loadLocalHistory();
    h.push({ role, text, at: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-MAX_LOCAL)));
  } catch { /* storage full */ }
}
