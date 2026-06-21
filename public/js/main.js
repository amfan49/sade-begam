// ── Sade Begam — load & render the weekly news ────────────────────
// Reads data/current-week.json and renders each official statement as a
// card: source organization, original quote, translation (if the original
// isn't in the page language), context, and a clickable source link.

// Date utilities live in i18n.js (sbGregorian / sbJalali / sbBothDates) so
// every page can share them.

let ALL_ITEMS = [];
let ACTIVE_REGION = "all";
let SEARCH = "";
let CURRENT_PAGE = 0;
const PAGE_SIZE = 20;

document.addEventListener("DOMContentLoaded", () => {
  applyLanguageChrome();
  loadNews();
  initDetailOverlay();
  initTranslationModal();
  startAutoRefresh();
});

// ── Detail overlay ────────────────────────────────────────────────
// Purely client-side. Content is rendered on demand from ALL_ITEMS and
// cleared on close — nothing is written to localStorage or the server.

function initDetailOverlay() {
  const overlay = document.getElementById("detailOverlay");
  const closeBtn = document.getElementById("detailClose");
  if (!overlay) return;

  closeBtn.setAttribute("aria-label", T.closeDetail);
  closeBtn.addEventListener("click", closeDetail);

  // "Back to home" button (keyboard/screen-reader accessible shortcut)
  const backBtn = document.getElementById("detailBackBtn");
  if (backBtn) backBtn.addEventListener("click", () => { closeDetail(); window.location.href = "index.html"; });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeDetail(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDetail(); });
  window.addEventListener("popstate", () => { if (!location.hash) closeDetail(); });
}

function openDetail(item) {
  const overlay = document.getElementById("detailOverlay");
  const body = document.getElementById("detailBody");
  if (!overlay || !body) return;

  const tr = item.translations ? item.translations[SB_LANG] : null;
  const hasTr = item.lang_original !== SB_LANG && tr && tr.headline;
  const origDir = item.lang_original === "fa" ? "rtl" : "ltr";

  body.innerHTML = `
    <div class="detail-header">
      <span class="detail-flag">${item.flag || "🏳️"}</span>
      <div class="detail-meta">
        <div class="detail-country">${item.country}</div>
        <div class="detail-org">${item.source_organization}</div>
        <div class="detail-date">${sbBothDates(item.date)}</div>
      </div>
      <span class="badge badge--official">✓ ${T.officialBadge}</span>
    </div>

    <hr class="detail-divider" />

    <section class="detail-section">
      <span class="card__quote-label">${T.originalLabel}</span>
      <h2 class="detail-headline" lang="${item.lang_original}" dir="${origDir}">${item.headline || ""}</h2>
      <p class="detail-excerpt" lang="${item.lang_original}" dir="${origDir}">${item.excerpt || ""}</p>
    </section>

    ${hasTr ? `
    <section class="detail-section detail-section--tr">
      <span class="card__quote-label">${T.translationLabel}</span>
      <h2 class="detail-headline">${tr.headline}</h2>
      <p class="detail-excerpt">${tr.excerpt || ""}</p>
      <p class="detail-disclaimer"><small>${T.translationDisclaimer}</small></p>
    </section>` : ""}

    <a class="detail-source-btn" href="${item.source_url}" target="_blank" rel="noopener noreferrer">
      🔗 ${T.viewSource}
    </a>
  `;

  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  history.pushState({ detailId: item.id }, "", `#${item.id}`);
}

function closeDetail() {
  const overlay = document.getElementById("detailOverlay");
  if (!overlay || !overlay.classList.contains("open")) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (location.hash) history.pushState(null, "", location.pathname + location.search);
  // Clear rendered content after animation — no stale data kept in DOM
  setTimeout(() => {
    const body = document.getElementById("detailBody");
    if (body) body.innerHTML = "";
  }, 320);
}

// Fill in all the static UI text from the language file.
function applyLanguageChrome() {
  document.documentElement.lang = T.htmlLang;
  document.documentElement.dir = T.dir;

  setText("brandName", T.brandName);
  setText("tagline", T.tagline);
  setText("taglineMain", T.heroMain);
  setText("taglineAccent", T.heroAccent);
  setText("kicker", T.kicker);
  setText("navHome", T.navHome);
  setText("navAbout", T.navAbout);
  setText("navArchive", T.navArchive);
  setText("navNewsletter", T.navNewsletter);
  setText("navOrders", T.navOrders);
  setText("footerNote", T.footerNote);
  setText("rights", T.rights);

  const search = document.getElementById("search");
  if (search) {
    search.placeholder = T.searchPlaceholder;
    search.addEventListener("input", (e) => {
      SEARCH = e.target.value.trim().toLowerCase();
      CURRENT_PAGE = 0;
      renderFeed();
    });
  }

  // Language switch buttons
  document.querySelectorAll("[data-setlang]").forEach((btn) => {
    if (btn.dataset.setlang === SB_LANG) btn.classList.add("active");
    btn.addEventListener("click", () => setLang(btn.dataset.setlang));
  });

  sbRenderCommonFooter();
  setText("detailBackBtn", T.backToHome);
}

// Client-side caching: show the cached copy instantly, then revalidate in
// the background (stale-while-revalidate). Saves bandwidth and renders fast
// on repeat visits. News + translations live together in current-week.json.
const NEWS_CACHE_KEY = "sb_current_week_v1";
const NEWS_CACHE_TTL = 0; // always revalidate — show cached instantly, then fetch fresh

function renderNews(data) {
  ALL_ITEMS = data.items || [];
  renderWeekStrip(data);
  buildRegionFilter();
  renderFeed();
}

async function loadNews() {
  let cached = null;
  try {
    cached = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY));
  } catch (_) { /* ignore corrupt cache */ }

  const fresh = cached && Date.now() - cached.at < NEWS_CACHE_TTL;
  if (cached && cached.data) renderNews(cached.data); // instant paint from cache

  // If the cache is still fresh, skip the network entirely.
  if (fresh) return;

  try {
    const res = await fetch("data/current-week.json", { cache: "no-cache" });
    const data = await res.json();
    try {
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
    } catch (_) { /* storage full / disabled — fine */ }
    renderNews(data);
  } catch (err) {
    console.error(err);
    if (!cached) {
      const feed = document.getElementById("feed");
      if (feed) feed.innerHTML = `<p class="muted">${T.noItems}</p>`;
    }
  }
}

function renderWeekStrip(data) {
  const el = document.getElementById("weekStrip");
  if (!el) return;
  const r = data.date_range || {};
  const weekMatch = String(data.week || "").match(/W(\d+)/);
  const weekNum = weekMatch ? weekMatch[1] : data.week;
  const weekLabel = SB_LANG === "fa" ? sbPersianDigits(weekNum) : weekNum;
  const start = r.start ? sbBothDates(r.start) : "";
  const end = r.end ? sbBothDates(r.end) : "";

  let updatedPart = "";
  if (data.published_at) {
    const pubDate = data.published_at.split("T")[0];
    updatedPart = ` · ${T.lastUpdated}: ${sbBothDates(pubDate)}`;
  }

  el.textContent = `${T.weekLabel} ${weekLabel} · ${start} – ${end}${updatedPart}`;
}

function buildRegionFilter() {
  const bar = document.getElementById("regionFilter");
  if (!bar) return;
  const regions = [...new Set(ALL_ITEMS.map((i) => i.region))];

  const make = (key, label) => {
    const b = document.createElement("button");
    b.className = "chip" + (key === ACTIVE_REGION ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", () => {
      ACTIVE_REGION = key;
      CURRENT_PAGE = 0;
      buildRegionFilter();
      renderFeed();
    });
    return b;
  };

  bar.innerHTML = "";
  bar.appendChild(make("all", T.filterAll));
  regions.forEach((r) => bar.appendChild(make(r, T.regions[r] || r)));
}

function renderFeed() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  let items = [...ALL_ITEMS].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (ACTIVE_REGION !== "all") items = items.filter((i) => i.region === ACTIVE_REGION);
  if (SEARCH) {
    items = items.filter((i) => {
      const fields = [
        i.country, i.source_organization, i.headline, i.excerpt,
        ...(i.topics || []),
        i.translations?.fa?.headline || "",
        i.translations?.fa?.excerpt || "",
        i.translations?.en?.headline || "",
        i.translations?.en?.excerpt || "",
      ].join(" ").toLowerCase();
      return fields.includes(SEARCH);
    });
  }

  // Persian page: only show items that have a Persian translation (or are originally Persian)
  if (SB_LANG === "fa") {
    items = items.filter(i => i.lang_original === "fa" || i.translations?.fa?.headline);
  }

  if (!items.length) {
    feed.innerHTML = `<p class="muted">${T.noItems}</p>`;
    return;
  }

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  if (CURRENT_PAGE >= totalPages) CURRENT_PAGE = totalPages - 1;
  if (CURRENT_PAGE < 0) CURRENT_PAGE = 0;

  const pageItems = items.slice(CURRENT_PAGE * PAGE_SIZE, (CURRENT_PAGE + 1) * PAGE_SIZE);

  feed.innerHTML = "";
  if (totalPages > 1) feed.appendChild(buildPagination(totalPages));
  pageItems.forEach((item) => feed.appendChild(renderCard(item)));
  if (totalPages > 1) feed.appendChild(buildPagination(totalPages));
}

function buildPagination(totalPages) {
  const nav = document.createElement("nav");
  nav.className = "pagination";

  const prev = document.createElement("button");
  prev.className = "pag-btn";
  prev.disabled = CURRENT_PAGE === 0;
  prev.textContent = SB_LANG === "fa" ? "→ قبلی" : "← Prev";
  prev.addEventListener("click", () => {
    if (CURRENT_PAGE > 0) { CURRENT_PAGE--; renderFeed(); scrollToFeed(); }
  });

  const info = document.createElement("span");
  info.className = "pag-info";
  const p = SB_LANG === "fa" ? sbPersianDigits(String(CURRENT_PAGE + 1)) : String(CURRENT_PAGE + 1);
  const t = SB_LANG === "fa" ? sbPersianDigits(String(totalPages)) : String(totalPages);
  info.textContent = SB_LANG === "fa" ? `صفحه ${p} از ${t}` : `Page ${p} of ${t}`;

  const next = document.createElement("button");
  next.className = "pag-btn";
  next.disabled = CURRENT_PAGE >= totalPages - 1;
  next.textContent = SB_LANG === "fa" ? "بعدی ←" : "Next →";
  next.addEventListener("click", () => {
    if (CURRENT_PAGE < totalPages - 1) { CURRENT_PAGE++; renderFeed(); scrollToFeed(); }
  });

  nav.appendChild(prev);
  nav.appendChild(info);
  nav.appendChild(next);
  return nav;
}

function scrollToFeed() {
  const el = document.getElementById("feed");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCard(item) {
  const card = document.createElement("article");
  card.className = "card";
  card.addEventListener("click", (e) => {
    if (e.target.closest(".card__source")) return;
    if (e.target.closest(".card__translation")) {
      openTranslationWindow(item);
      return;
    }
    openDetail(item);
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.closest(".card__translation")) {
      openTranslationWindow(item);
    }
  });

  const tr = item.translations ? item.translations[SB_LANG] : null;
  const showTr = item.lang_original !== SB_LANG && tr && tr.headline;
  const origDir = item.lang_original === "fa" ? "rtl" : "ltr";

  const imageHTML = item.image
    ? `<img class="card__photo" src="${item.image}" alt="${item.country}" loading="lazy" />`
    : `<span class="card__flag-badge">${item.flag || "🏳️"}</span>`;

  card.innerHTML = `
    <header class="card__head">
      ${imageHTML}
      <div class="card__meta">
        <div class="card__country">${item.flag || ""} ${item.country}</div>
        <div class="card__org">${item.source_organization}</div>
        <div class="card__date">${sbBothDates(item.date)}</div>
      </div>
      <span class="badge badge--official">✓ ${T.officialBadge}</span>
    </header>

    <div class="card__body">
      <h3 class="card__headline" lang="${item.lang_original}" dir="${origDir}">${item.headline || ""}</h3>
      <p class="card__excerpt" lang="${item.lang_original}" dir="${origDir}">${item.excerpt || ""}</p>

      ${
        showTr
          ? `<div class="card__translation" role="button" tabindex="0" title="${T.trModalTitle}" aria-label="${T.trModalTitle}">
               <span class="card__quote-label">${T.translationLabel} ↗</span>
               <h4 class="card__headline-tr">${tr.headline}</h4>
               <p>${tr.excerpt || ""}</p>
               <p class="card__disclaimer"><small>${T.translationDisclaimer}</small></p>
             </div>`
          : ""
      }
    </div>

    <a class="card__source" href="${item.source_url}" target="_blank" rel="noopener noreferrer">
      🔗 ${T.sourceLabel}: ${item.source_organization} →
    </a>
  `;
  return card;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ── Auto-refresh: poll current-week.json every 5 minutes ─────────
function startAutoRefresh() {
  const INTERVAL = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      const res = await fetch("data/current-week.json", { cache: "no-cache" });
      const data = await res.json();
      try { localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch (_) {}
      const prevCount = ALL_ITEMS.length;
      renderNews(data);
      if (data.items && data.items.length > prevCount) {
        showRefreshBanner();
      }
    } catch (_) {}
  }, INTERVAL);
}

function showRefreshBanner() {
  let banner = document.getElementById("sbRefreshBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "sbRefreshBanner";
    banner.className = "sb-refresh-banner";
    banner.addEventListener("click", () => banner.remove());
    document.body.appendChild(banner);
  }
  banner.textContent = T.autoRefreshNotice || "News updated.";
  setTimeout(() => banner && banner.remove(), 5000);
}

// ── Translation modal ─────────────────────────────────────────────
// Lightweight popup: click the translation snippet on a card to see
// the full translation in a centered modal (memory-light, quick to close).

function initTranslationModal() {
  const modal = document.getElementById("trModal");
  if (!modal) return;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeTranslationModal();
  });
  const closeBtn = document.getElementById("trModalClose");
  if (closeBtn) closeBtn.addEventListener("click", closeTranslationModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeTranslationModal();
  });
}

function openTranslationModal(item) {
  const modal = document.getElementById("trModal");
  const body = document.getElementById("trModalBody");
  if (!modal || !body) return;

  const tr = item.translations ? item.translations[SB_LANG] : null;
  const hasFullTr = tr && tr.headline;

  body.innerHTML = `
    <div class="tr-modal__header">
      <span class="tr-modal__flag">${item.flag || "🌍"}</span>
      <div>
        <div class="tr-modal__country">${item.country}</div>
        <div class="tr-modal__org">${item.source_organization}</div>
        <div class="tr-modal__date">${sbBothDates(item.date)}</div>
      </div>
    </div>
    <h2 class="tr-modal__headline">${hasFullTr ? tr.headline : item.headline}</h2>
    <p class="tr-modal__excerpt">${hasFullTr ? (tr.excerpt || "") : (item.excerpt || "")}</p>
    <p class="tr-modal__disclaimer"><small>${T.trModalDisclaimer}</small></p>
    <a class="tr-modal__source-btn" href="${item.source_url}" target="_blank" rel="noopener noreferrer">
      🔗 ${T.trModalSource}
    </a>
  `;

  setText("trModalTitle", T.trModalTitle);
  setText("trModalClose", T.trModalClose);

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeTranslationModal() {
  const modal = document.getElementById("trModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  setTimeout(() => {
    const body = document.getElementById("trModalBody");
    if (body) body.innerHTML = "";
  }, 220);
}

function openTranslationWindow(item) {
  const tr = item.translations ? item.translations[SB_LANG] : null;
  const hasFullTr = tr && tr.headline;
  const headline = hasFullTr ? tr.headline : item.headline;
  const excerpt  = hasFullTr ? (tr.excerpt || "") : (item.excerpt || "");
  const dir      = SB_LANG === "fa" ? "rtl" : "ltr";
  const fontUrl  = SB_LANG === "fa"
    ? "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap"
    : "https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap";
  const fontFam  = SB_LANG === "fa" ? "Vazirmatn, sans-serif" : "Outfit, sans-serif";
  const disclaimer = T.trModalDisclaimer || "";
  const sourceLabel = T.trModalSource || "View Official Source";
  const closeLabel  = T.trModalClose  || "Close";

  const win = window.open("", "_blank");
  if (!win) { openTranslationModal(item); return; }

  win.document.write(`<!DOCTYPE html>
<html dir="${dir}" lang="${SB_LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${item.flag || ""} ${item.country} — Sade Begam</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="${fontUrl}" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:${fontFam};background:#F5F7FA;color:#1C2233;line-height:1.75;padding:16px}
.card{background:#fff;border-radius:16px;box-shadow:0 2px 16px rgba(0,0,0,.09);max-width:680px;margin:20px auto;padding:28px 28px 32px}
.meta-row{display:flex;align-items:center;gap:12px;margin-bottom:20px}
.flag{font-size:36px;flex-shrink:0}
.country{font-weight:700;font-size:16px}
.org{color:#1A6FBF;font-size:13px;margin-top:2px}
.date{font-size:12px;color:#6B7A94;margin-top:2px}
h1{font-size:21px;font-weight:700;line-height:1.4;margin-bottom:16px;color:#1C2233}
p{font-size:16px;line-height:1.85;color:#3D4560;margin-bottom:16px}
.disclaimer{font-size:12px;color:#9AA3B5;padding-top:14px;border-top:1px solid #E8ECF2}
.source-btn{display:block;text-align:center;background:#1A6FBF;color:#fff;text-decoration:none;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:700;margin-top:22px;transition:background .15s}
.source-btn:hover{background:#155A9A}
.close-btn{display:block;text-align:center;background:none;border:none;color:#9AA3B5;font-size:13px;margin:14px auto 0;cursor:pointer;font-family:inherit}
</style>
</head>
<body>
<div class="card">
  <div class="meta-row">
    <span class="flag">${item.flag || "🌍"}</span>
    <div>
      <div class="country">${item.country}</div>
      <div class="org">${item.source_organization}</div>
      <div class="date">${item.date || ""}</div>
    </div>
  </div>
  <h1>${headline}</h1>
  <p>${excerpt}</p>
  <p class="disclaimer">${disclaimer}</p>
  <a class="source-btn" href="${item.source_url}" target="_blank" rel="noopener noreferrer">🔗 ${sourceLabel}</a>
  <button class="close-btn" onclick="window.close()">✕ ${closeLabel}</button>
</div>
</body>
</html>`);
  win.document.close();
}
