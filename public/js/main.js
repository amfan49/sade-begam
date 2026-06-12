// ── Sade Begam — load & render the weekly news ────────────────────
// Reads data/current-week.json and renders each official statement as a
// card: source organization, original quote, translation (if the original
// isn't in the page language), context, and a clickable source link.

let ALL_ITEMS = [];
let ACTIVE_REGION = "all";
let SEARCH = "";

document.addEventListener("DOMContentLoaded", () => {
  applyLanguageChrome();
  loadNews();
});

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
}

async function loadNews() {
  try {
    const res = await fetch("data/current-week.json", { cache: "no-store" });
    const data = await res.json();
    ALL_ITEMS = data.items || [];

    renderWeekStrip(data);
    if (data.is_sample) showSampleBadge();
    buildRegionFilter();
    renderFeed();
  } catch (err) {
    console.error(err);
    const feed = document.getElementById("feed");
    if (feed) feed.innerHTML = `<p class="muted">${T.noItems}</p>`;
  }
}

function renderWeekStrip(data) {
  const el = document.getElementById("weekStrip");
  if (!el) return;
  const r = data.date_range || {};
  el.textContent = `${T.weekLabel} ${data.week} · ${r.start} – ${r.end} · ${T.updated}`;
}

function showSampleBadge() {
  const el = document.getElementById("sampleBadge");
  if (el) {
    el.textContent = T.sampleBadge;
    el.hidden = false;
  }
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
    items = items.filter((i) =>
      (i.country + " " + i.source_organization + " " + (i.topics || []).join(" "))
        .toLowerCase()
        .includes(SEARCH)
    );
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
        <div class="card__date">${item.date}</div>
      </div>
      <span class="badge badge--official">✓ ${T.officialBadge}</span>
    </header>

    <div class="card__body">
      <h3 class="card__headline" lang="${item.lang_original}" dir="${origDir}">${item.headline || ""}</h3>
      <p class="card__excerpt" lang="${item.lang_original}" dir="${origDir}">${item.excerpt || ""}</p>

      ${
        showTr
          ? `<div class="card__translation">
               <span class="card__quote-label">${T.translationLabel}</span>
               <h4 class="card__headline-tr">${tr.headline}</h4>
               <p>${tr.excerpt || ""}</p>
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
