// ── Sade Begam — load & render the weekly news ────────────────────
// Reads data/current-week.json and renders each official statement as a
// card: source organization, original quote, translation (if the original
// isn't in the page language), context, and a clickable source link.

// Date utilities live in i18n.js (sbGregorian / sbJalali / sbBothDates) so
// every page can share them.

let ALL_ITEMS = [];
let ACTIVE_REGION = "all";
let SEARCH = "";

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
const NEWS_CACHE_TTL = 60 * 60 * 1000; // 1h — treat cache as "fresh" within this

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
    const res = await fetch("data/current-week.json", { cache: "default" });
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

  let items = ALL_ITEMS;
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

  if (!items.length) {
    feed.innerHTML = `<p class="muted">${T.noItems}</p>`;
    return;
  }

  feed.innerHTML = "";
  items.forEach((item) => feed.appendChild(renderCard(item)));
}

function renderCard(item) {
  const card = document.createElement("article");
  card.className = "card";
  card.addEventListener("click", (e) => {
    if (e.target.closest(".card__source")) return;
    if (e.target.closest(".card__translation")) {
      openTranslationModal(item);
      return;
    }
    openDetail(item);
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.closest(".card__translation")) {
      openTranslationModal(item);
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
               <p>${tr.excerpt ? tr.excerpt.slice(0, 200) + (tr.excerpt.length > 200 ? "…" : "") : ""}</p>
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
