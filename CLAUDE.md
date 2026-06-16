# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Sade Begam** — an independent Persian news-aggregation site that relays only official statements about Iran from official sources (foreign ministries, verified official accounts). No analysis, no interpretation, no third-party media. Every item links to its official source.

Stack: **plain HTML + CSS + vanilla JS** (no framework, no build step). Served from `public/`. Deployed to **Vercel free tier** via CLI. Data stored as JSON files in `public/data/`.

## Running locally

```bash
# Start the local preview server (Node static server, port 3100):
eval "$(/opt/homebrew/bin/brew shellenv)"
node server.js
# open http://localhost:3100
```

## Deploying

```bash
# Commit, push to GitHub, then deploy to Vercel production:
eval "$(/opt/homebrew/bin/brew shellenv)"
git add <files> && git commit -m "..."
git push origin main
vercel --prod --yes
```

**One project only.** Do not create a second Vercel project or GitHub repo. Everything stays inside this `sade-begam/` folder.

Always include co-author trailer on commits:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

## Running the news collector (draft only)

```bash
# Collect last 1 day of Iran news from official RSS feeds:
node agent/collect.js

# Wider window for testing:
DAYS=30 node agent/collect.js
```

Output: `public/data/draft-week.json`. **Never auto-publish** — Amir reviews the draft, then manually moves approved items into `current-week.json` and `archive.json`.

## Instagram card generator

```bash
node social/generate-instagram.js   # optionally MAX=5
```

Output: `social/post-latest.html` (1080×1080 card) + `social/caption-latest.txt`.

## Syntax checking (no test suite)

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
node --check public/js/main.js
node --check public/js/i18n.js
node --check public/js/archive.js
node --check agent/collect.js
node --check social/generate-instagram.js
```

---

## Architecture

### Language / i18n (`public/js/i18n.js`)

`i18n.js` is loaded on **every** page first. It provides:

- `STRINGS` — all UI text in both languages (`fa` / `en`). Every new string must be added in both.
- `SB_LANG` — current language, detected from `localStorage("sb_lang")`, URL param `?lang=`, or `navigator.language` (Persian if starts with "fa", else English).
- `T` — shorthand alias for `STRINGS[SB_LANG]`. All pages use `T.*` for text.
- `setLang(lang)` — saves to localStorage and reloads.
- **All shared date helpers** — must live here so every page can use them:
  - `sbToJalali(gy, gm, gd)` — canonical jalaali-js Gregorian→Jalali algorithm. Returns `{jy, jm, jd}` with the real day-of-month (NOT day-of-year — a previous bug that must not be reintroduced).
  - `sbGregorian(iso)` → `"13 June"` (English page).
  - `sbGregorianFa(iso)` → `"۱۳ ژوئن"` (Gregorian in Persian words + Persian digits).
  - `sbJalali(iso)` → `"۲۳ خرداد"` (Jalali, Persian digits, no year).
  - `sbBothDates(iso)` — **language-aware, one line, single script**: FA page → `"۲۳ خرداد · ۱۳ ژوئن"`; EN page → `"13 June"`. No mixed Persian/Latin scripts on the same page.
  - `sbPersianDigits(s)` — converts ASCII digits to Persian.
  - `sbTodayIso()` — today as `YYYY-MM-DD`.
  - `sbRenderCommonFooter()` — fills `#todayDate` and `#nonProfitFooter` on every page.

### Home feed (`public/js/main.js`)

Loaded only on `index.html`. Reads `public/data/current-week.json`, renders news cards. Key design:
- **Stale-while-revalidate** cache: `localStorage("sb_current_week_v1")`, TTL 1h. Shows cached copy instantly, revalidates in background.
- `renderCard(item)` shows original headline/excerpt + a translation block (only when `item.lang_original !== SB_LANG`). Translation disclaimer is appended to every translation.
- `applyLanguageChrome()` sets all static text via `setText(id, T.*)` and calls `sbRenderCommonFooter()`.

### Archive (`public/js/archive.js`)

Loaded only on `archive.html`. Merges `archive.json` + `current-week.json`, dedupes by `item.id`, sorts newest-first. Groups by day / week (ISO week) / month / year via granularity chips. Same SWR cache pattern (`sb_archive_v1`).

### Data files (`public/data/`)

| File | Purpose |
|---|---|
| `current-week.json` | Live news items — reviewed and approved by Amir |
| `archive.json` | All past published items |
| `draft-week.json` | Auto-collected candidates — **review before promoting** |
| `sources.json` | Registry of official sources |

**News item schema** (required fields): `id`, `date` (YYYY-MM-DD), `country`, `flag`, `region`, `source_organization`, `source_url`, `is_official: true`, `lang_original`, `headline`, `excerpt`, `translations: { en: null|{headline,excerpt}, fa: null|{headline,excerpt} }`, `topics`.

### Pages (`public/*.html`)

All pages share the same nav structure and footer. Every HTML page must include:
- Nav link: `<a class="nav__link" href="archive.html" id="navArchive">Archive</a>`
- Footer date: `<p class="footer__today" id="todayDate"></p>`
- Footer legal: `<p class="footer__legal" id="nonProfitFooter"></p>`
- The inline script at bottom calls `sbRenderCommonFooter()` and sets nav text via `setText("navArchive", T.navArchive)`.

### Week strip / last-updated display (`public/js/main.js`)

The hero section shows `#weekStrip` with: week number, date range, and **last updated date**.
- The last-updated date is read from `data.published_at` in `current-week.json` and formatted with `sbBothDates()` — fully Persian on the FA page, English on the EN page.
- i18n key: `T.lastUpdated` ("آخرین به‌روزرسانی" / "Last updated"). Do NOT hardcode a day name.

### Automation (`.github/workflows/daily-update.yml`)

Two jobs, runs **every hour** + **on every push to main**:

| Job | Trigger | What it does |
|---|---|---|
| `collect` | 4× daily (06/12/18/00 UTC) / manual | Runs `collect.js`, commits `draft-week.json` if changed |
| `deploy-on-push` | push to `main` | Deploys to Vercel immediately (e.g. when Amir approves and pushes `current-week.json`) |

Client-side also polls `current-week.json` every **5 minutes** (`startAutoRefresh()` in `main.js`) and shows a blue banner if new items appear.

---

## News sources (`agent/feeds.json` + `public/data/sources.json`)

**57 RSS/Atom feed entries** covering all 60 official primary sources. The collector skips any that fail — safe to add uncertain URLs. Sources are organized in 6 categories:

| Category | Count | Examples |
|---|---|---|
| Iran — Government | 18 | Khamenei.ir, President.ir, MFA Iran, AEOI, NIOC, Parliament, Central Bank, Judiciary, Ministries, Embassies UK/RU/CN |
| USA — Government | 8 | White House, State Dept, US Special Envoy Iran, Treasury/OFAC, CENTCOM, Senate/House FRC |
| Europe | 7 | FCDO, Germany AA, Bundeskanzler, France Diplomatie, EEAS, Council EU |
| Middle East | 6 | Israel PM, Israeli MFA, Saudi MFA, UAE MFA |
| International Bodies | 9 | UN News, IAEA, IAEA-DG, UN Security Council, OHCHR, UN Special Procedures, NATO, OSCE, European Commission |
| Think Tanks | 20 | WINEP, FDD, MEI, USIP, Crisis Group, Atlantic Council, CFR, Brookings, Carnegie, CSIS, RAND, Stimson, ECFR, Chatham House, SWP, DGAP, IISS, B&B, AGSIW, INSS |

**Note on Iranian government ministry feeds:** Many Iranian ministry sites (MOI, MCLS, Judiciary, CBI, etc.) have Persian-only RSS or may block international access. The collector silently skips failing feeds — these are listed as best-guess URLs. The key Iran sources (Khamenei, President, MFA, AEOI, UN Mission) are well-tested and reliable.

`public/data/sources.json` mirrors all 60 sources with `flag`, `name`, `country`, `region`, `homepage`, `twitter` fields. Grouped by region on the About page with Twitter/X links. Keep in sync with `agent/feeds.json`.

Each feed entry in `feeds.json` now has a `lang` field (e.g. `"fa"`, `"de"`, `"fr"`, `"en"`) used by `collect.js` to set `lang_original` on collected items.

**When adding feeds:** only official government/intergovernmental/think-tank RSS/Atom. No media outlets. The collector skips failed feeds automatically.

---

## Accessibility (`public/js/accessibility.js` + `public/css/style.css`)

Loaded on **every page** before main scripts. Runs immediately (IIFE) to prevent theme flash.

| Feature | How |
|---|---|
| Dark mode | `data-theme="dark"` on `<html>`, CSS vars override in `[data-theme="dark"]` |
| Font size | `data-fontsize="large/xlarge"` on `<html>`, adds 10%/25% to base size |
| Persistence | Both settings saved to localStorage (`sb_theme`, `sb_fontsize`) |
| UI | Floating vertical bar (bottom-right / bottom-left RTL): 🌙 toggle, A+, A− |

Exposed globals: `sbToggleTheme()`, `sbFontSizeChange(delta)`.

i18n keys: `T.darkMode`, `T.lightMode`, `T.fontLarger`, `T.fontSmaller`, `T.a11yBar`.

---

## Chatbot + Voice Agent (`public/js/chatbot.js`)

Loaded on **every page**. 100% free — no external API. Floating 💬 button (bottom corner).

### Features
| Feature | Implementation |
|---|---|
| News search | Searches `ALL_ITEMS` (index.html) or localStorage cache (other pages) |
| Twitter search | Generates `twitter.com/search?q=Iran+{query}&f=news` link — no API needed |
| Newsletter | Routes to `newsletter.html` |
| Contact/order | Routes to `orders.html` |
| TTS (Voice) | `window.speechSynthesis` — reads news aloud in correct language (fa-IR / en-US) |
| STT (Mic) | `window.SpeechRecognition` — voice search input; Chrome only |
| Multilingual | Reads `T.chat.*` strings from i18n.js for FA/EN |

### Search logic
1. **Iran pre-filter (explicit):** Before keyword search, `sbChatSearch` filters the item pool to only items where headline/excerpt/topics contain "iran" OR `item.country === "Iran"`. This guarantees the chatbot never surfaces off-topic results even if the data cache is contaminated.
2. Search filtered items by keyword (country, headline, excerpt, topics, translations)
3. Show top 3 results with flag, date, original headline, translation, source link
4. Always append Twitter search link for broader discovery

### Commands (both languages)
`help` · `newsletter` · `contact` · `read news` (TTS) · `stop` · any topic keyword → search

### Globals needed
- `ALL_ITEMS` (defined in `main.js`, optional — falls back to localStorage)
- `SB_LANG`, `T` from `i18n.js`
- `sbBothDates`, `sbPersianDigits` from `i18n.js`

### Important constraints
- No external API calls, no localStorage writes for chat data
- TTS requires user interaction (browser policy); STT requires Chrome/Safari
- Twitter link is a **link** only — no scraping, no API

---

## Claude update rule

**After every change made to this project, update `CLAUDE.md` to reflect what changed.** This applies to: new sources, schedule changes, schema changes, new pages, new JS behavior, new brand constraints — anything non-trivial. Keep entries concise (one line or a short table row). Do not document ephemeral debugging or one-off test commands.

## Detail overlay (`public/js/main.js` + `public/css/style.css`)

When a user clicks a news card, a side-panel overlay opens showing the full item:
- Flag, country, org, date (Persian-formatted on FA page)
- Original text (headline + excerpt, in original language/direction)
- Translation block (if `item.lang_original !== SB_LANG` and translation exists)
- Translation disclaimer
- Large "View Official Source" button linking to `item.source_url`

**No server storage:** content is rendered from `ALL_ITEMS` on demand. DOM is cleared 320ms after close (after CSS transition). Nothing written to localStorage for the detail view.

URL hash: `#item-id` is pushed when a detail opens (browser back button closes it). Clicking the backdrop or pressing Escape also closes it.

Strings added to `i18n.js`: `closeDetail`, `viewSource` (both FA and EN).

## Translation modal (`public/js/main.js` + `public/css/style.css`)

A **lightweight centered modal** (distinct from the full detail overlay) opens when the user clicks the translation block inside a news card.

- Shows: flag, country, org, date, full translation headline + excerpt, AI disclaimer, source button
- HTML: `#trModal` (`.tr-modal`) + `#trModalBody` + `#trModalClose` in `index.html`
- JS: `openTranslationModal(item)` / `closeTranslationModal()` / `initTranslationModal()`
- Closes on: backdrop click, ✕ button, Escape key
- Panel scales in (CSS `scale(0.96→1)`) for lightweight feel
- i18n keys: `T.trModalTitle`, `T.trModalClose`, `T.trModalSource`, `T.trModalDisclaimer`

## Auto-refresh (`public/js/main.js`)

`startAutoRefresh()` runs on page load (index.html only). Polls `data/current-week.json` with `cache: "no-cache"` every **5 minutes**. If new items arrive, re-renders the feed and shows `#sbRefreshBanner` (a dismissible blue pill) for 5 seconds. i18n key: `T.autoRefreshNotice`.

---

## Date display rules (Persian page)

All dates on the Persian page must be fully in Persian script and numerals. Specific rules:

- **Card dates** (`main.js` `renderCard`): use `sbBothDates(item.date)` → e.g. `۱۸ خرداد · ۸ ژوئن`
- **Week strip** (`main.js` `renderWeekStrip`): extract week number from `"2026-W24"`, convert to Persian digits; format `date_range.start` and `date_range.end` via `sbBothDates()`
- **Archive — group by month**: on Persian page use `sbToJalali()` → Jalali month name + Jalali year in Persian digits (e.g. `خرداد ۱۴۰۵`)
- **Archive — group by week**: year label in Persian digits
- **Archive — group by year**: on Persian page convert Gregorian year to Jalali year via `sbToJalali(y, 7, 1)` and display in Persian digits
- **Footer today date**: `sbRenderCommonFooter()` already uses `sbBothDates()` — correct

---

## Brand constraints

- **Colors:** primary blue `#1A6FBF`, accent orange `#FF6B35`, dark `#1C2233`, page bg `#F5F7FA`.
- **Fonts:** Vazirmatn (Persian/RTL), Outfit (English/LTR). Both loaded via Google Fonts.
- **No paid APIs.** All tools must be free (RSS, GitHub Actions, Vercel free tier, Node built-ins).
- **No auto-publishing.** All news requires human review by Amir before going into `current-week.json`.
- **Donation / financial text is intentionally present** on `orders.html` (`sourceNote` / `supportNote`). Do not remove it unless Amir asks.
- **Do not make public** without explicit instruction from Amir. Site is live but unlisted (share only with friends).
