// ── Sade Begam Chatbot + Voice Agent ────────────────────────────
// 100% free: searches locally collected news, links to Twitter/X.
// Voice: uses browser Web Speech API (SpeechSynthesis + SpeechRecognition).
// No external API keys, no server storage.

let SB_READING = false;
let SB_READ_IDX = 0;

// ── Helpers ───────────────────────────────────────────────────────

function _sbGetAllNews() {
  // 1. From main.js global (index.html only)
  if (typeof ALL_ITEMS !== "undefined" && ALL_ITEMS.length) return ALL_ITEMS;
  // 2. From localStorage cache (other pages)
  try {
    const cw = JSON.parse(localStorage.getItem("sb_current_week_v2"));
    const items = cw?.data?.items || [];
    const arc = JSON.parse(localStorage.getItem("sb_archive_v2"));
    const arcItems = arc?.items || arc?.data?.items || [];
    const ids = new Set(items.map((i) => i.id));
    arcItems.forEach((i) => { if (!ids.has(i.id)) items.push(i); });
    return items;
  } catch (_) { return []; }
}

function _sbTwUrl(q) {
  return "https://twitter.com/search?q=" + encodeURIComponent("Iran " + q) + "&f=news";
}

// Western sources are always listed before Iranian sources (sbIranLast
// lives in i18n.js, which loads before this file on every page).
function _sbWesternFirst(items) {
  return [...items].sort(sbIranLast);
}

function _sbLink(href, label) {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="sb-chat-result-link">${label}</a>`;
}

function _sbEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Init ──────────────────────────────────────────────────────────

function sbChatInit() {
  if (document.getElementById("sbChat")) return; // already mounted
  const T = typeof window.T !== "undefined" ? window.T : {};
  const chat = T.chat || {};

  const widget = document.createElement("div");
  widget.id = "sbChat";
  widget.className = "sb-chat-widget";
  widget.innerHTML = `
    <div class="sb-chat-panel" id="sbChatPanel">
      <div class="sb-chat-head">
        <span>${chat.title || "Sade Begam"}</span>
        <div class="sb-chat-head-btns">
          <button class="sb-chat-head-btn" id="sbChatTtsBtn" title="${chat.readNews || "Read news"}" aria-label="${chat.readNews || "Read news"}">🔊</button>
          <button class="sb-chat-head-btn" id="sbChatClose" aria-label="${chat.close || "Close"}">✕</button>
        </div>
      </div>
      <div class="sb-chat-messages" id="sbChatMessages" role="log" aria-live="polite"></div>
      <div class="sb-chat-input-row">
        <button class="sb-chat-mic" id="sbChatMic" title="${chat.micHint || "Voice input"}" aria-label="${chat.micHint || "Voice input"}">🎤</button>
        <input class="sb-chat-input" id="sbChatInput"
               placeholder="${chat.placeholder || "Search…"}"
               autocomplete="off" aria-label="${chat.placeholder || "Search…"}" />
        <button class="sb-chat-send" id="sbChatSend" aria-label="${chat.send || "Send"}">➤</button>
      </div>
    </div>
    <button class="sb-chat-fab" id="sbChatFab" aria-label="${chat.open || "Chat"}" title="${chat.open || "Chat"}">💬</button>
  `;
  document.body.appendChild(widget);

  document.getElementById("sbChatFab").addEventListener("click", sbChatOpen);
  document.getElementById("sbChatClose").addEventListener("click", sbChatClose);
  document.getElementById("sbChatSend").addEventListener("click", sbChatSubmit);
  document.getElementById("sbChatTtsBtn").addEventListener("click", sbReadNews);
  document.getElementById("sbChatMic").addEventListener("click", sbChatMic);
  document.getElementById("sbChatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sbChatSubmit();
  });

  // Greeting
  sbBotMsg((chat.greeting || "Welcome!"), false);
  sbBotMsg((chat.helpHint || "Type a topic to search. Type 'help' for commands."), false);
}

// ── Open / Close ──────────────────────────────────────────────────

function sbChatOpen() {
  document.getElementById("sbChatPanel").classList.add("open");
  document.getElementById("sbChatFab").style.display = "none";
  document.getElementById("sbChatInput").focus();
}

function sbChatClose() {
  document.getElementById("sbChatPanel").classList.remove("open");
  document.getElementById("sbChatFab").style.display = "";
  sbStopReading();
}

// ── Messages ──────────────────────────────────────────────────────

function sbBotMsg(content, isHTML) {
  const msgs = document.getElementById("sbChatMessages");
  if (!msgs) return;
  const div = document.createElement("div");
  div.className = "sb-chat-msg sb-chat-msg--bot";
  if (isHTML) div.innerHTML = content;
  else div.textContent = content;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function sbUserMsg(text) {
  const msgs = document.getElementById("sbChatMessages");
  if (!msgs) return;
  const div = document.createElement("div");
  div.className = "sb-chat-msg sb-chat-msg--user";
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// ── Submit / Respond ──────────────────────────────────────────────

function sbChatSubmit() {
  const input = document.getElementById("sbChatInput");
  const q = input.value.trim();
  if (!q) return;
  input.value = "";
  sbUserMsg(q);
  setTimeout(() => sbChatRespond(q), 150);
}

function sbChatRespond(query) {
  const T = typeof window.T !== "undefined" ? window.T : {};
  const chat = T.chat || {};
  const q = query.toLowerCase();
  // Commands only fire on short, command-like messages; longer sentences
  // containing these words ("executive order on Iran") are real searches.
  const isCommand = (re) => q.split(/\s+/).length <= 3 && re.test(q);

  // Greeting — must be the whole message, otherwise "history…"/"سلامت…"
  // would be hijacked by the bare prefix.
  if (/^(سلام|درود|hello|hi|hey|hallo|bonjour)[\s!!.؟?،,]*$/.test(q)) {
    sbBotMsg(chat.greetBack || "Hello! How can I help?", false);
    return;
  }
  // Help
  if (/^(راهنما|کمک|help|\?|؟)[\s!!.؟?،,]*$/.test(q)) {
    sbBotMsg(chat.helpText ||
      "Commands: search [topic] · newsletter · contact · read news", true);
    return;
  }
  // Newsletter
  if (isCommand(/(خبرنامه|newsletter|subscribe|اشتراک)/)) {
    sbBotMsg(`${chat.newsletterReply || "Subscribe here:"} ${_sbLink("newsletter.html", "📧 Newsletter")}`, true);
    return;
  }
  // Contact / Order
  if (isCommand(/(تماس|contact|سفارش|order|درخواست)/)) {
    sbBotMsg(`${chat.contactReply || "Contact / order:"} ${_sbLink("orders.html", "📩 " + (chat.contactLink || "Order"))}`, true);
    return;
  }
  // Read news (TTS)
  if (isCommand(/(بخوان|read.?news|صدا|voice|speak|vorlesen)/)) {
    sbReadNews();
    return;
  }
  // Stop reading
  if (isCommand(/(توقف|stop|pause|بایست)/)) {
    sbStopReading();
    sbBotMsg(chat.stopped || "Stopped.", false);
    return;
  }
  // Default: search
  sbChatSearch(query);
}

// ── Search ────────────────────────────────────────────────────────

function sbChatSearch(query) {
  const T = typeof window.T !== "undefined" ? window.T : {};
  const chat = T.chat || {};
  const lang = typeof SB_LANG !== "undefined" ? SB_LANG : "en";
  const items = _sbGetAllNews();
  const qLow = query.toLowerCase();

  if (!items.length) {
    sbBotMsg(`${chat.noLocalData || "No local data."} ${_sbLink(_sbTwUrl(query), "🐦 Twitter/X")}`, true);
    return;
  }

  // Strict filter: only items that mention Iran (topic or source)
  const iranItems = items.filter((item) => {
    const allText = [item.headline, item.excerpt,
      item.translations?.fa?.headline || "", item.translations?.en?.headline || "",
      ...(item.topics || [])].join(" ").toLowerCase();
    return allText.includes("iran") || item.country === "Iran";
  });

  const results = _sbWesternFirst(iranItems.filter((item) => {
    const txt = [
      item.country, item.source_organization,
      item.headline, item.excerpt,
      ...(item.topics || []),
      item.translations?.fa?.headline || "",
      item.translations?.fa?.excerpt || "",
      item.translations?.en?.headline || "",
    ].join(" ").toLowerCase();
    return txt.includes(qLow);
  }));

  if (!results.length) {
    const noRes = (chat.noResults || 'No results for "{q}". Search on Twitter:').replace('{q}', _sbEscape(query));
    sbBotMsg(`${noRes} ${_sbLink(_sbTwUrl(query), "🐦 Twitter/X →")}`, true);
    return;
  }

  const n = results.length;
  const nLabel = lang === "fa" && typeof sbPersianDigits !== "undefined" ? sbPersianDigits(n) : n;
  sbBotMsg((chat.found || "{n} result(s):").replace("{n}", nLabel), false);

  results.slice(0, 3).forEach((item) => {
    const tr = item.translations?.[lang];
    const hasTr = item.lang_original !== lang && tr?.headline;
    const date = typeof sbBothDates !== "undefined" ? sbBothDates(item.date) : item.date;
    const html = `<div class="sb-chat-result">
      <div class="sb-chat-result-head">
        <strong>${item.country}</strong>
        <span class="sb-chat-result-date">${date}</span>
      </div>
      <div class="sb-chat-result-orig" lang="${item.lang_original}" dir="${item.lang_original === "fa" ? "rtl" : "ltr"}">${item.headline}</div>
      ${hasTr ? `<div class="sb-chat-result-tr">${tr.headline}</div>` : ""}
      <div class="sb-chat-result-actions" style="margin-top:6px;">
        ${_sbLink(item.source_url, "🔗 " + (chat.source || "Source"))}
      </div>
    </div>`;
    sbBotMsg(html, true);
  });

  if (n > 3) {
    const more = n - 3;
    const moreLabel = lang === "fa" && typeof sbPersianDigits !== "undefined" ? sbPersianDigits(more) : more;
    sbBotMsg((chat.moreResults || "+{n} more. Refine your search.").replace("{n}", moreLabel), false);
  }

  // Always offer Twitter for broader search
  sbBotMsg(`${chat.twitterTip || "Also search Twitter:"} ${_sbLink(_sbTwUrl(query), "🐦 Twitter/X →")}`, true);
}

// ── TTS — reads news aloud ────────────────────────────────────────

function sbReadNews() {
  const T = typeof window.T !== "undefined" ? window.T : {};
  const chat = T.chat || {};
  const lang = typeof SB_LANG !== "undefined" ? SB_LANG : "en";

  if (!window.speechSynthesis) {
    sbBotMsg(chat.ttsNotSupported || "TTS not supported in this browser.", false);
    return;
  }
  const items = _sbGetAllNews();
  if (!items.length) {
    sbBotMsg(chat.noNewsToRead || "No news loaded yet.", false);
    return;
  }

  SB_READING = true;
  SB_READ_IDX = 0;
  sbBotMsg(chat.readingNews || "Reading news…", false);

  // getVoices() is async on first page load — wait if list is empty
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    _sbReadItem(items, lang);
  } else {
    window.speechSynthesis.addEventListener("voiceschanged", () => _sbReadItem(items, lang), { once: true });
  }
}

function _sbReadItem(items, lang) {
  if (!SB_READING || SB_READ_IDX >= items.length) { SB_READING = false; return; }
  const item = items[SB_READ_IDX];

  // Persian TTS voices are almost never installed in browsers.
  // When voiceLang = "fa-IR" has no matching voice, the browser's fallback
  // voice silently skips Arabic-script characters and reads only the "."
  // separator aloud — which sounds like "Punkt" in German browsers.
  // Fix: only use fa-IR when a Persian voice is actually available;
  // otherwise read the English translation so the user hears real content.
  const voices = window.speechSynthesis.getVoices();
  const hasFaVoice = voices.some(v => v.lang && v.lang.startsWith("fa"));

  let text, voiceLang;

  if (lang === "fa" && hasFaVoice) {
    const trFa = item.translations?.fa;
    const faHead = item.lang_original === "fa" ? item.headline : (trFa?.headline || item.headline);
    const faExc  = item.lang_original === "fa" ? (item.excerpt || "") : (trFa?.excerpt || "");
    text = `${faHead}. ${faExc}`;
    voiceLang = "fa-IR";
  } else {
    // No Persian voice — read English text with English voice
    const trEn = item.translations?.en;
    const enHead = item.lang_original === "en" ? item.headline : (trEn?.headline || item.headline);
    const enExc  = item.lang_original === "en" ? (item.excerpt || "") : (trEn?.excerpt || item.excerpt || "");
    text = `${enHead}. ${enExc}`;
    voiceLang = "en-US";
  }

  const utter = new SpeechSynthesisUtterance(text.substring(0, 500));
  utter.lang = voiceLang;
  utter.rate = 0.92;
  utter.onend = () => {
    SB_READ_IDX++;
    if (SB_READING) _sbReadItem(items, lang);
  };
  utter.onerror = () => { SB_READ_IDX++; if (SB_READING) _sbReadItem(items, lang); };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function sbStopReading() {
  SB_READING = false;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ── STT — voice input ─────────────────────────────────────────────

function sbChatMic() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const T = typeof window.T !== "undefined" ? window.T : {};
  const chat = T.chat || {};
  const lang = typeof SB_LANG !== "undefined" ? SB_LANG : "en";

  if (!Rec) {
    sbBotMsg(chat.sttNotSupported || "Voice input not supported in this browser. Please use Chrome.", false);
    return;
  }

  const micBtn = document.getElementById("sbChatMic");
  if (micBtn) micBtn.classList.add("listening");

  const rec = new Rec();
  rec.lang = lang === "fa" ? "fa-IR" : "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onresult = (e) => {
    const transcript = e.results[0]?.[0]?.transcript || "";
    if (micBtn) micBtn.classList.remove("listening");
    const input = document.getElementById("sbChatInput");
    if (input) { input.value = transcript; sbChatSubmit(); }
  };
  rec.onerror = () => { if (micBtn) micBtn.classList.remove("listening"); };
  rec.onend   = () => { if (micBtn) micBtn.classList.remove("listening"); };
  rec.start();
}

// ── Mount ─────────────────────────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", sbChatInit);
} else {
  sbChatInit();
}
