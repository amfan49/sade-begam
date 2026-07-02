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
node --check public/js/chatbot.js
node --check public/js/chat-page.js
node --check agent/collect.js
node --check agent/weekly-report.js
node --check agent/send-weekly-report.js
node --check social/generate-instagram.js
for f in api/*.js api/_lib/*.js; do node --check "$f"; done
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

**News item schema** (required fields): `id`, `date` (YYYY-MM-DD), `country`, `flag` (data only, never rendered — see News sources section), `region`, `source_organization`, `source_url`, `is_official: true`, `lang_original`, `headline`, `excerpt`, `translations: { en: null|{headline,excerpt}, fa: null|{headline,excerpt} }`, `topics`.

**`data/subscribers.json`** (repo root, **not** under `public/`) holds real newsletter subscriber emails — deliberately outside the publicly-served directory. See the Newsletter section below.

### Pages (`public/*.html`)

All pages share the same nav structure and footer. Every HTML page must include:
- Nav link: `<a class="nav__link" href="archive.html" id="navArchive">Archive</a>`
- Footer date: `<p class="footer__today" id="todayDate"></p>`
- Footer legal: `<p class="footer__legal" id="nonProfitFooter"></p>`
- The inline script at bottom calls `sbRenderCommonFooter()` and sets nav text via `setText("navArchive", T.navArchive)`.

### Header clock / last-updated display (`public/js/main.js`)

The hero section's `#weekStrip` shows a **permanently live Berlin-timezone clock** plus the **last-updated date** — no week number, no Jalali/solar-calendar date here (removed by request; Jalali dates still appear elsewhere, e.g. on news cards and in the archive).
- `formatBerlinDateTime()` uses `Intl.DateTimeFormat` with `timeZone: "Europe/Berlin"`, re-rendered every 30s via `setInterval` (`_berlinClockTimer`). Date portion goes through `sbGregorian`/`sbGregorianFa` (plain Gregorian, no Jalali) so no solar-calendar date leaks into the header.
- The last-updated date is read from `data.published_at` in `current-week.json`, formatted the same way (plain Gregorian, no Jalali).
- i18n key: `T.lastUpdated` ("آخرین به‌روزرسانی" / "Last updated"), `T.berlinTime` ("ساعت برلین" / "Berlin time").

### Automation (`.github/workflows/weekly-update.yml`, `approve-single.yml`, `archive-cleanup.yml`)

**Runs once a week, not daily/hourly** (changed 2026-07-02 to save GitHub Actions minutes and Vercel build minutes). There is **no Vercel↔GitHub Git integration** (verified: no webhook on the repo) — deploys only ever happen via explicit `vercel --prod` calls, never automatically on push.

| Workflow | Trigger | What it does |
|---|---|---|
| `weekly-update.yml` | Sunday 08:00 Europe/Berlin (DST-safe gate job) / manual | `collect` job runs `collect.js` (7-day window) and commits `draft-week.json` if changed; `send-digest` job (needs `collect`) emails Amir a digest with one-click approve links (skipped if no new items) |
| `approve-single.yml` | Amir clicks a "Publish" link in the digest email, or manual `workflow_dispatch` | Runs `approve.js` for the given item (or `all`), commits `current-week.json`, then deploys to Vercel via CLI — **this is the only place a deploy happens** |
| `archive-cleanup.yml` | 1st of each month | Removes archive items older than 2 years |

Client-side also polls `current-week.json` every **5 minutes** (`startAutoRefresh()` in `main.js`) and shows a blue banner if new items appear — this is a client-side fetch of a static JSON file, not a rebuild/redeploy.

---

## News sources (`agent/feeds.json` + `public/data/sources.json`)

**Strictly official/state/intergovernmental sources only.** **Think tanks were removed entirely on 2026-07-02** (FDD, CFR, Brookings, RAND, WINEP, MEI, USIP, Crisis Group, Atlantic Council, Carnegie, CSIS, Stimson, ECFR, Chatham House, SWP, DGAP, IISS, Bourse & Bazaar, AGSIW, INSS — 20 feeds) — they are private policy-research organizations, not official government sources, and were previously mislabeled with the "✓ Official" badge. This also removed **148 already-published items** (83% of the live feed at the time) that had been sourced from them; **31 genuinely official items remained live** after the purge.

`agent/feeds.json` (**41 entries**, used by the collector) and `public/data/sources.json` (**40 entries**, used by the About page) are maintained separately and use slightly different region groupings — keep both in sync when adding/removing a source. `sources.json`'s regions, by count:

| Category | Count | Examples |
|---|---|---|
| Iran — Government | 18 | Khamenei.ir, President.ir, MFA Iran, AEOI, NIOC, Parliament, Central Bank, Judiciary, Ministries, Embassies UK/RU/CN |
| USA — Government | 7 | White House, State Dept, US Special Envoy Iran, Treasury/OFAC, CENTCOM |
| Europe | 5 | FCDO, Germany AA, France Diplomatie, EEAS, Council EU |
| Middle East | 4 | Israel PM/MFA, Saudi MFA, UAE MFA |
| International Bodies | 6 | UN News, IAEA, UN Security Council, NATO, OSCE, European Commission |

**Note on Iranian government ministry feeds:** Many Iranian ministry sites (MOI, MCLS, Judiciary, CBI, etc.) have Persian-only RSS or may block international access. The collector silently skips failing feeds — these are listed as best-guess URLs. The key Iran sources (Khamenei, President, MFA, AEOI, UN Mission) are well-tested and reliable.

`public/data/sources.json` mirrors its sources with `flag` (data only — **never rendered**, see below), `name`, `country`, `region`, `homepage`, `twitter` fields. Grouped by region on the About page with Twitter/X links, **Western regions listed before "Iran — Government"** (sorted in `about.html`'s render script).

Each feed entry in `feeds.json` now has a `lang` field (e.g. `"fa"`, `"de"`, `"fr"`, `"en"`) used by `collect.js` to set `lang_original` on collected items.

**When adding feeds:** only official government/intergovernmental RSS/Atom — no think tanks, no media outlets. The collector skips failed feeds automatically.

### No flags, ever (2026-07-02)

Flag emoji are never rendered anywhere — site pages, admin panel (AmirCheck.html uses a neutral 📰), and emails (digest-email.js) — only the country name as text. The `flag` field still exists in the data files (harmless, unused) but every renderer was updated to omit it. **Western sources are always sorted before Iranian sources** wherever a list of items/sources appears. Browser code uses the shared comparator **`sbIranLast(a, b)` in `i18n.js`** (loaded on every page — use it, don't re-implement); `api/chat.js` and `agent/weekly-report.js` keep local copies because they run outside the browser and can't load i18n.js.

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

## Chatbot + Voice Agent

There are three chat surfaces, all sharing the same free approach (**permanently free — no API key, no external LLM, ever**, rewritten 2026-07-02):

1. **Floating widget** (`public/js/chatbot.js`) — loaded on every page. Fully client-side (local search over cached news + `window.speechSynthesis`/`SpeechRecognition`). Floating 💬 button (bottom corner).
2. **Full chat page** (`chat.html` + `public/js/chat-page.js`) — POSTs to `api/chat.js`. Has its own local-search fallback for network errors, but that's now a defensive fallback only, not a paid/free switch.
3. **Embeddable widget** (`public/js/widget.js`, for embedding on other sites) and **Telegram bot** (`api/telegram.js`) — both call `api/chat.js` too.

**`api/chat.js`** used to require `ANTHROPIC_API_KEY` (paid Claude API) with a free local-search fallback when the key was absent. As of 2026-07-02 the paid code path was **removed entirely** (not just left dormant) so the site can never accidentally incur LLM cost. It now always: detects language (from a `lang` field the caller sends, or a Persian-Unicode regex over the query), fetches `current-week.json` + `archive.json` from the live site (**cached in module scope for 5 min** — don't remove the cache, warm invocations must not re-download), and replies with warm, polite, multilingual (fa/en) canned text — greeting / help / newsletter / contact / voice-hint / keyword search (Western-sources-first, no flags), same tone as the in-page widget.

**Chat routing rules (all three surfaces — api/chat.js, chatbot.js, chat-page.js — must stay in sync):** greetings/help only match when they are the **whole message** (a bare `^hi` prefix hijacked "history…"/"سلامت…"); newsletter/contact/voice commands only fire on messages of **≤ 3 words** so real searches like "executive order on Iran" fall through to search.

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

## Card click behavior (`public/js/main.js`)

**(Rewritten 2026-07-02.)** The old side-panel "detail overlay" was removed entirely (it duplicated what the translation window + source link already cover). Each home-page card now has exactly two click targets:

- **Click the translation block** (`.card__translation`) → `openTranslationWindow(item)` opens the **full translated text in a new browser window/tab** (own HTML document, not an in-page modal), with the AI-translation disclaimer, a 🔊 listen (TTS) button, and a "View Official Source" link. If the popup is blocked, it falls back to `openTranslationModal(item)` (a lightweight in-page modal, `#trModal`) with the same content.
- **Click anywhere else on the card** (original headline/excerpt/photo/meta) → goes **directly to the official source** (`window.open(item.source_url, "_blank")`). The `.card__source` link at the bottom does the same natively.

Both the original excerpt and the translation excerpt are **CSS line-clamped to 5 lines** on the home page (`-webkit-line-clamp: 5`) — the full text is always one click away (source link or translation window), never truncated with a fake "read more" that goes nowhere.

## Translation window / modal (`public/js/main.js` + `public/css/style.css`)

- Primary: `openTranslationWindow(item)` — a real `window.open()` popup, fully self-contained HTML (own `<style>`, own TTS script), shows country/org/date, full translation, AI disclaimer, 🔊 listen button, source link, close button.
- Fallback (popup blocked): `openTranslationModal(item)` — lightweight centered modal, `#trModal` (`.tr-modal`) + `#trModalBody` + `#trModalClose` in `index.html`. Closes on backdrop click, ✕ button, Escape key.
- i18n keys: `T.trModalTitle`, `T.trModalClose`, `T.trModalSource`, `T.trModalDisclaimer`

## Auto-refresh (`public/js/main.js`)

`startAutoRefresh()` runs on page load (index.html only). Polls `data/current-week.json` with `cache: "no-cache"` every **5 minutes**. If new items arrive, re-renders the feed and shows `#sbRefreshBanner` (a dismissible blue pill) for 5 seconds. i18n key: `T.autoRefreshNotice`.

---

## Impressum + contact form (`public/about.html`, `api/contact.js`) — added 2026-07-02

The About page's "impressum-section" now opens with a **site-operator block**: name **Amir Fanaei**, deliberately **no postal address** (site is framed as personal/private information purposes, matching `T.nonProfitNotice`), an email link, and a real **contact form**. The existing privacy/newsletter-data copy stays below it.

- Form fields: name (optional), email (required), message (required) → POSTs JSON to `api/contact.js`.
- `api/contact.js` emails the message to the operator (`amfan49@gmail.com`) via Resend, with `reply_to` set to the visitor's address so Amir can just hit reply. **Nothing is stored** — no database, no file write.
- Needs `RESEND_API_KEY` (Vercel env var, free tier — **not yet configured**, see below). Returns 503 until it is; the form then shows `T.impressum.formError`.

## Newsletter — real double opt-in (`public/newsletter.html`, `api/subscribe.js`, `api/confirm.js`, `api/unsubscribe.js`) — added 2026-07-02

Replaced the old `mailto:` placeholder with a **real** signup flow. No new database — subscribers are stored as a JSON file in the private GitHub repo, read/written via the GitHub Contents API (same pattern `api/approve.js` already used for news items), using the `GH_PAT` env var that's already configured on Vercel.

- **`data/subscribers.json`** — deliberately **NOT** under `public/` (that folder is served to every visitor as static files; this one holds real email addresses and must never be publicly fetchable). Shape: `{ subscribers: [{ email, lang, confirm_token, unsubscribe_token, confirmed, created_at, confirmed_at }] }`. This intentionally deviates from the original briefing's "hash only" idea — a hash can't be emailed, and the file lives in a private repo, so plaintext was judged an acceptable, functional trade-off.
- **`api/subscribe.js`** (POST `{email, lang}`): validates, stores a pending entry (or reuses one if already pending), emails a confirmation link via Resend to the **subscriber's own address**. Returns `{ ok, emailSent, alreadySubscribed }` — the frontend degrades gracefully if the email couldn't be sent.
- All three subscriber endpoints go through **`updateJsonFile()` in `api/_lib/github.js`** — a read-modify-write with retry on 409 sha-conflicts, so two overlapping requests can't silently lose a write. Use it (not raw read+write) for any future GitHub-JSON mutation. Shared branded result pages live in **`api/_lib/html.js`** (`htmlPage()` — used by approve/confirm/unsubscribe). Files under `api/_lib/` are not exposed as endpoints (Vercel skips underscore-prefixed paths).
- **`api/confirm.js`** (GET `?token=`): flips `confirmed: true` for the matching entry. This is what actually activates the subscription.
- **`api/unsubscribe.js`** (GET `?token=`): removes the subscriber entirely. Link is included in the confirmation email and every weekly report.
- **Known limitation:** Resend's free tier can only deliver to arbitrary third-party recipients once a **sending domain is verified** (DNS records). Until Amir verifies a domain (e.g. `sadebegam.com`) with Resend, confirmation/report emails will only actually arrive for `amfan49@gmail.com` — real subscribers will be stored but won't receive the email. `emailSent: false` surfaces this honestly to the frontend rather than pretending it worked.

## Weekly subscriber report (`agent/weekly-report.js`, `agent/send-weekly-report.js`, `.github/workflows/weekly-report.yml`) — added 2026-07-02

Separate from `weekly-update.yml` (which emails **Amir** a draft-review digest). This one emails **confirmed subscribers** a recap of official items published in the last 7 days (Western sources first, no flags, country name only).

- `agent/weekly-report.js` — pure function `buildReportHtml(items, lang, unsubscribeUrl)`; run directly (`node agent/weekly-report.js`) to preview the HTML locally.
- `agent/send-weekly-report.js` — the actual sender. **`TEST_ONLY` defaults to `true`**: every run (scheduled *and* manual) sends one preview to `amfan49@gmail.com` only, never real subscribers, until Amir explicitly edits `weekly-report.yml` to set `TEST_ONLY: "false"`. This was a deliberate safety default — Amir asked to review a sample email before this goes live.
- Runs Sundays at 10:00 UTC (after the draft digest), or on demand via `workflow_dispatch`. Needs `RESEND_API_KEY` as a GitHub Actions secret (**not yet added**, see below).

## Free-tier email service (Resend) — status 2026-07-02

`weekly-update.yml`'s admin digest email and the three features above all call the Resend API via `RESEND_API_KEY`. **This secret does not exist yet** — neither as a GitHub Actions secret (`gh secret list` only shows `APPROVE_SECRET` and `VERCEL_TOKEN`) nor as a Vercel env var. Until Amir creates a free Resend account, generates an API key, and adds it as `RESEND_API_KEY` in both places (`gh secret set RESEND_API_KEY` and `vercel env add RESEND_API_KEY`), every email-sending code path fails gracefully (503 / logged error) but sends nothing. Resend's free tier: 100 emails/day, 3,000/month, forever free — well within this site's scale.

---

## Date display rules (Persian page)

All dates on the Persian page must be fully in Persian script and numerals. Specific rules:

- **Card dates** (`main.js` `renderCard`): use `sbBothDates(item.date)` → e.g. `۱۸ خرداد · ۸ ژوئن`
- **Header/week strip** (`main.js` `renderWeekStrip`): **no Jalali date here by design** (removed 2026-07-02) — shows a live Berlin-timezone clock + last-updated, both via `sbGregorian`/`sbGregorianFa` (plain Gregorian only). Jalali still applies everywhere else below.
- **Archive — group by month**: on Persian page use `sbToJalali()` → Jalali month name + Jalali year in Persian digits (e.g. `خرداد ۱۴۰۵`)
- **Archive — group by week**: year label in Persian digits
- **Archive — group by year**: on Persian page convert Gregorian year to Jalali year via `sbToJalali(y, 7, 1)` and display in Persian digits
- **Footer today date**: `sbRenderCommonFooter()` already uses `sbBothDates()` — correct

---

## Brand constraints

- **Colors:** primary blue `#1A6FBF`, accent orange `#FF6B35`, dark `#1C2233`, page bg `#F5F7FA`.
- **Fonts:** Vazirmatn (Persian/RTL), Outfit (English/LTR). Both loaded via Google Fonts.
- **No paid APIs, ever.** All tools must be free (RSS, GitHub Actions, Vercel free tier, Node built-ins, Resend free tier). The AI chatbot in particular must never depend on a paid LLM key — see the Chatbot section above.
- **Sources strictly official/state/intergovernmental only** — no think tanks, no media outlets (enforced 2026-07-02, see News sources section).
- **No flags, ever** — country name text only, wherever a source is shown. **Western sources always listed before Iranian sources.**
- **No auto-publishing.** All news requires human review by Amir before going into `current-week.json`.
- **Footer already carries the "purely informational, privately run, no commercial interest" notice** on every page — `T.nonProfitNotice`, rendered by `sbRenderCommonFooter()` into `#nonProfitFooter`. Do not remove.
- **Impressum:** operator name "Amir Fanaei", deliberately no postal address (personal/private-information framing), contact via email + contact form only (`about.html`, see Impressum section above).
- **Donation / financial text is intentionally present** on `orders.html` (`sourceNote` / `supportNote`). Do not remove it unless Amir asks.
- **Do not make public** without explicit instruction from Amir. Site is live but unlisted (share only with friends).
