// ── Sade Begam — AI Chat page ─────────────────────────────────
// Full chat interface for /chat.html
// Uses /api/chat (the shared brain) — requires ANTHROPIC_API_KEY on Vercel

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

const messagesEl  = document.getElementById("chatMessages");
const inputEl     = document.getElementById("chatInput");
const sendBtn     = document.getElementById("chatSend");
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
  // Load persisted local history (short-term visual)
  const saved = loadLocalHistory();
  if (saved.length) {
    saved.forEach(m => appendBubble(m.role, m.text, false));
    hideSuggestions();
  } else {
    showGreeting();
  }

  // Suggestion chips
  document.querySelectorAll(".chat-suggestions__chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const q = chip.dataset.q;
      if (q) sendMessage(q);
    });
  });

  // Input events
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

function showGreeting() {
  const greeting = T.aiChat?.greeting ||
    "سلام! 👋 من بگم‌بات هستم — دستیار هوشمند سایت «ساده بگم».\n\nمی‌توانید سؤالاتتان درباره اخبار رسمی ایران را بپرسید، یا از چیپس‌های زیر برای شروع استفاده کنید.";
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
    const res = await fetch(CHAT_API, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        messages:   [{ role: "user", content: text }],
        session_id: SESSION_ID,
        source:     "web"
      })
    });

    const data = await res.json();
    removeTyping(typingEl);
    const reply = data.response || (T.aiChat?.error || "خطا در دریافت پاسخ.");
    appendBubble("bot", reply);
    saveToHistory("bot", reply);
  } catch (err) {
    console.error("Chat error:", err);
    removeTyping(typingEl);
    appendBubble("bot", T.aiChat?.error || "متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید.");
  } finally {
    IS_SENDING = false;
    sendBtn.disabled = !inputEl.value.trim();
    inputEl.focus();
  }
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
  bubble.textContent = text; // safe — no innerHTML

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
