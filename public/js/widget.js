// ── Sade Begam — Embeddable Chat Widget ──────────────────────────
// Usage: add to any HTML page:
//   <script src="https://sade-begam.vercel.app/js/widget.js" defer></script>
//
// Optional attributes on the script tag:
//   data-lang="fa"    (default: fa)
//   data-position="left"  (default: right)

(function () {
  "use strict";

  var CHAT_API   = "https://sade-begam.vercel.app/api/chat";
  var SESSION_KEY = "sb_widget_session";
  var HISTORY_KEY = "sb_widget_history";

  // Config from script tag
  var scriptEl  = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();
  var LANG      = (scriptEl && scriptEl.getAttribute("data-lang")) || "fa";
  var POSITION  = (scriptEl && scriptEl.getAttribute("data-position")) || "right";

  // Labels
  var LABELS = {
    fa: {
      name:        "بگم‌بات",
      subtitle:    "دستیار هوشمند",
      placeholder: "پیامتان را بنویسید…",
      greeting:    "سلام! 👋 چطور می‌توانم کمک کنم؟",
      error:       "خطا در دریافت پاسخ. دوباره تلاش کنید.",
      dir:         "rtl"
    },
    en: {
      name:        "SaBot",
      subtitle:    "AI Assistant",
      placeholder: "Type your message…",
      greeting:    "Hello! 👋 How can I help you?",
      error:       "Error getting response. Please try again.",
      dir:         "ltr"
    }
  };
  var L = LABELS[LANG] || LABELS.fa;

  // Session
  function getSession() {
    var s = localStorage.getItem(SESSION_KEY);
    if (!s) { s = "wgt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); localStorage.setItem(SESSION_KEY, s); }
    return s;
  }

  var SESSION_ID = getSession();
  var IS_SENDING = false;

  // ── Inject widget HTML ──────────────────────────────────────

  function createWidget() {
    var side = POSITION === "left" ? "left:20px;right:auto" : "right:20px;left:auto";
    var panelSide = POSITION === "left" ? "left:20px;right:auto" : "right:20px;left:auto";
    var dir  = L.dir;

    // Floating button
    var btn = document.createElement("button");
    btn.id = "sb-widget-btn";
    btn.style.cssText = "position:fixed;bottom:20px;" + side + ";width:54px;height:54px;" +
      "border-radius:50%;background:#FF6B35;color:#fff;border:none;cursor:pointer;" +
      "font-size:24px;display:flex;align-items:center;justify-content:center;" +
      "box-shadow:0 4px 20px rgba(0,0,0,.22);z-index:2147483647;transition:transform .18s";
    btn.innerHTML = "💬";
    btn.setAttribute("aria-label", L.name);

    // Chat panel
    var panel = document.createElement("div");
    panel.id = "sb-widget-panel";
    panel.style.cssText = "position:fixed;bottom:88px;" + panelSide + ";width:340px;max-height:480px;" +
      "background:#fff;border-radius:18px;box-shadow:0 8px 40px rgba(0,0,0,.18);" +
      "z-index:2147483646;display:none;flex-direction:column;overflow:hidden;" +
      "border:1px solid #E8ECF2;font-family:Vazirmatn,Outfit,system-ui,sans-serif;" +
      "direction:" + dir;

    panel.innerHTML =
      '<div style="background:#1C2233;color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0">' +
        '<div style="width:34px;height:34px;border-radius:50%;background:#FF6B35;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🤖</div>' +
        '<div style="flex:1">' +
          '<div style="font-weight:700;font-size:14px">' + L.name + '</div>' +
          '<div style="font-size:11px;color:#A0C4E8">' + L.subtitle + '</div>' +
        '</div>' +
        '<button id="sb-widget-close" style="background:none;border:none;color:#9AA3B5;cursor:pointer;font-size:18px;padding:0 4px;line-height:1">✕</button>' +
      '</div>' +
      '<div id="sb-widget-msgs" style="flex:1;overflow-y:auto;padding:12px 10px;display:flex;flex-direction:column;gap:8px;direction:' + dir + '"></div>' +
      '<div style="background:#fff;border-top:1px solid #E8ECF2;padding:10px;display:flex;gap:8px;align-items:center;flex-shrink:0;direction:' + dir + '">' +
        '<input id="sb-widget-input" type="text" placeholder="' + L.placeholder + '" ' +
          'style="flex:1;border:1px solid #D0D8EC;border-radius:16px;padding:8px 13px;font-size:13px;font-family:inherit;outline:none;background:#F5F7FA;color:#1C2233;direction:' + dir + '" />' +
        '<button id="sb-widget-send" style="width:34px;height:34px;border-radius:50%;background:#1A6FBF;color:#fff;border:none;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s">↑</button>' +
      '</div>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    // Events
    var isOpen = false;
    btn.addEventListener("click", function () {
      isOpen = !isOpen;
      panel.style.display = isOpen ? "flex" : "none";
      btn.innerHTML = isOpen ? "✕" : "💬";
      if (isOpen) {
        var msgs = document.getElementById("sb-widget-msgs");
        if (!msgs.children.length) showGreeting(msgs);
        var inp = document.getElementById("sb-widget-input");
        if (inp) setTimeout(function () { inp.focus(); }, 80);
      }
    });

    document.getElementById("sb-widget-close").addEventListener("click", function () {
      isOpen = false;
      panel.style.display = "none";
      btn.innerHTML = "💬";
    });

    var inp  = document.getElementById("sb-widget-input");
    var send = document.getElementById("sb-widget-send");

    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !IS_SENDING && inp.value.trim()) doSend();
    });

    send.addEventListener("click", function () {
      if (!IS_SENDING && inp.value.trim()) doSend();
    });
  }

  // ── Greeting ───────────────────────────────────────────────

  function showGreeting(msgsEl) {
    addBubble(msgsEl || getMsgs(), "bot", L.greeting);
  }

  function getMsgs() { return document.getElementById("sb-widget-msgs"); }

  // ── Send ───────────────────────────────────────────────────

  function doSend() {
    var inp  = document.getElementById("sb-widget-input");
    var msgs = getMsgs();
    var text = inp.value.trim();
    if (!text || IS_SENDING) return;

    addBubble(msgs, "user", text);
    inp.value = "";
    IS_SENDING = true;

    var typing = addTyping(msgs);

    fetch(CHAT_API, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        messages:   [{ role: "user", content: text }],
        session_id: SESSION_ID,
        source:     "widget",
        lang:       LANG
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      removeEl(typing);
      addBubble(msgs, "bot", data.response || L.error);
    })
    .catch(function () {
      removeEl(typing);
      addBubble(msgs, "bot", L.error);
    })
    .finally(function () { IS_SENDING = false; });
  }

  // ── Bubble helpers ──────────────────────────────────────────

  function addBubble(container, role, text) {
    var isBot = (role === "bot" || role === "assistant");
    var wrap  = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:6px;max-width:88%;" +
      (isBot ? "align-self:flex-start" : "align-self:flex-end;flex-direction:row-reverse");

    var bubble = document.createElement("div");
    bubble.style.cssText = "padding:8px 12px;border-radius:14px;font-size:13px;line-height:1.6;" +
      "white-space:pre-wrap;word-break:break-word;" +
      (isBot
        ? "background:#F5F7FA;color:#1C2233;border-bottom-right-radius:4px"
        : "background:#1A6FBF;color:#fff;border-bottom-left-radius:4px");
    bubble.textContent = text;

    wrap.appendChild(bubble);
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
    return wrap;
  }

  function addTyping(container) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;align-items:center;gap:4px;padding:10px 12px;" +
      "background:#F5F7FA;border-radius:14px;width:fit-content;align-self:flex-start";
    wrap.innerHTML =
      "<span style='width:6px;height:6px;border-radius:50%;background:#7A8AA8;animation:sbt 1.2s infinite'></span>" +
      "<span style='width:6px;height:6px;border-radius:50%;background:#7A8AA8;animation:sbt 1.2s .2s infinite'></span>" +
      "<span style='width:6px;height:6px;border-radius:50%;background:#7A8AA8;animation:sbt 1.2s .4s infinite'></span>";
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
    return wrap;
  }

  function removeEl(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

  // ── Inject keyframe animation once ─────────────────────────

  function injectStyles() {
    if (document.getElementById("sb-widget-styles")) return;
    var s = document.createElement("style");
    s.id = "sb-widget-styles";
    s.textContent =
      "@keyframes sbt{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}";
    document.head.appendChild(s);
  }

  // ── Boot ───────────────────────────────────────────────────

  function boot() {
    injectStyles();
    createWidget();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
