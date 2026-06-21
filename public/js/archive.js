// ── Sade Begam — archive browser ──────────────────────────────────
// Loads the archive (plus the current week, merged + de-duplicated) and
// lets the visitor browse all official news grouped by day, week, month,
// or year. Each entry keeps its source link and headline translation.
// Uses the same client-side cache idea as the home feed.

const ARC_CACHE_KEY = "sb_archive_v1";
const ARC_CACHE_TTL = 0; // always revalidate

let ARC_ITEMS = [];
let ARC_GRANULARITY = "month"; // day | week | month | year

document.addEventListener("DOMContentLoaded", () => {
  applyChrome();
  loadArchive();
});

function applyChrome() {
  document.documentElement.lang = T.htmlLang;
  document.documentElement.dir = T.dir;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  set("brandName", T.brandName); set("tagline", T.tagline);
  set("navHome", T.navHome); set("navAbout", T.navAbout);
  set("navArchive", T.navArchive);
  set("navNewsletter", T.navNewsletter); set("navOrders", T.navOrders);
  set("footerNote", T.footerNote); set("rights", T.rights);
  sbRenderCommonFooter();

  set("arcTitle", T.archive.title);
  set("arcIntro", T.archive.intro);
  set("arcGroupLabel", T.archive.groupBy);

  // Granularity buttons
  const map = { day: T.archive.day, week: T.archive.week, month: T.archive.month, year: T.archive.year };
  document.querySelectorAll("[data-gran]").forEach((btn) => {
    btn.textContent = map[btn.dataset.gran];
    if (btn.dataset.gran === ARC_GRANULARITY) btn.classList.add("active");
    btn.addEventListener("click", () => {
      ARC_GRANULARITY = btn.dataset.gran;
      document.querySelectorAll("[data-gran]").forEach((b) => b.classList.toggle("active", b === btn));
      renderGroups();
    });
  });

  document.querySelectorAll("[data-setlang]").forEach((btn) => {
    if (btn.dataset.setlang === SB_LANG) btn.classList.add("active");
    btn.addEventListener("click", () => setLang(btn.dataset.setlang));
  });
}

async function loadArchive() {
  // Instant paint from cache, then revalidate.
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(ARC_CACHE_KEY)); } catch (_) {}
  if (cached && cached.items) { ARC_ITEMS = cached.items; renderGroups(); }
  if (cached && Date.now() - cached.at < ARC_CACHE_TTL) return;

  try {
    const [arc, week] = await Promise.all([
      fetch("data/archive.json", { cache: "no-cache" }).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch("data/current-week.json", { cache: "no-cache" }).then((r) => r.json()).catch(() => ({ items: [] }))
    ]);

    const byId = new Map();
    [...(arc.items || []), ...(week.items || [])].forEach((it) => { if (it && it.id) byId.set(it.id, it); });
    ARC_ITEMS = [...byId.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    try { localStorage.setItem(ARC_CACHE_KEY, JSON.stringify({ at: Date.now(), items: ARC_ITEMS })); } catch (_) {}
    renderGroups();
  } catch (err) {
    console.error(err);
    if (!cached) document.getElementById("arcGroups").innerHTML = `<p class="muted">${T.archive.empty}</p>`;
  }
}

// ISO week number for "group by week".
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

// Returns { key, label } for an item's date at the current granularity.
function groupOf(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  switch (ARC_GRANULARITY) {
    case "day":
      return { key: iso, label: sbBothDates(iso) };
    case "week": {
      const w = isoWeek(date);
      const wl = SB_LANG === "fa" ? sbPersianDigits(w.week) : w.week;
      const yearLabel = SB_LANG === "fa" ? sbPersianDigits(w.year) : String(w.year);
      return { key: `${w.year}-W${String(w.week).padStart(2, "0")}`, label: `${T.archive.week} ${wl} · ${yearLabel}` };
    }
    case "year": {
      if (SB_LANG === "fa") {
        const j = sbToJalali(y, 7, 1);
        return { key: String(y), label: sbPersianDigits(j.jy) };
      }
      return { key: String(y), label: String(y) };
    }
    case "month":
    default: {
      if (SB_LANG === "fa") {
        const j = sbToJalali(y, m, 15);
        return { key: `${y}-${String(m).padStart(2, "0")}`, label: `${SB_JALALI_MONTHS[j.jm - 1]} ${sbPersianDigits(j.jy)}` };
      }
      const monthName = SB_MONTHS_EN[m - 1];
      return { key: `${y}-${String(m).padStart(2, "0")}`, label: `${monthName} ${y}` };
    }
  }
}

function renderGroups() {
  const wrap = document.getElementById("arcGroups");
  if (!wrap) return;

  if (!ARC_ITEMS.length) {
    wrap.innerHTML = `<p class="muted">${T.archive.empty}</p>`;
    return;
  }

  // Bucket items (already sorted newest-first) by group key.
  const groups = new Map();
  ARC_ITEMS.forEach((item) => {
    if (!item.date) return;
    const g = groupOf(item.date);
    if (!groups.has(g.key)) groups.set(g.key, { label: g.label, items: [] });
    groups.get(g.key).items.push(item);
  });

  // Sort group keys newest-first.
  const keys = [...groups.keys()].sort((a, b) => b.localeCompare(a));

  wrap.innerHTML = "";
  keys.forEach((k) => {
    const g = groups.get(k);
    const section = document.createElement("section");
    section.className = "arc-group";
    section.innerHTML = `
      <h2 class="arc-group__title">${g.label}
        <span class="arc-group__count">${g.items.length} ${T.archive.count}</span>
      </h2>
      <div class="arc-list"></div>`;
    const list = section.querySelector(".arc-list");
    g.items.forEach((item) => list.appendChild(renderArcItem(item)));
    wrap.appendChild(section);
  });
}

function renderArcItem(item) {
  const a = document.createElement("a");
  a.className = "arc-item";
  a.href = item.source_url || "#";
  a.target = "_blank";
  a.rel = "noopener noreferrer";

  // Show the headline in the reader's language when a translation exists.
  const tr = item.translations ? item.translations[SB_LANG] : null;
  const headline = (item.lang_original !== SB_LANG && tr && tr.headline) ? tr.headline : item.headline;

  a.innerHTML = `
    <span class="arc-item__flag">${item.flag || "🏳️"}</span>
    <span class="arc-item__body">
      <span class="arc-item__date">${sbBothDates(item.date)}</span>
      <span class="arc-item__headline">${headline || ""}</span>
      <span class="arc-item__country">${item.country} · ${item.source_organization}</span>
    </span>`;
  return a;
}
