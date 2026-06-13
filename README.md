# Sade Begam

**Official News. No Filter.** — Independent Persian news media that aggregates official statements about Iran from around the world. No interpretation, no rumors — every item links to its official source.

## Status
Test phase (private). Plain HTML/CSS/JS. Hosted free on Vercel. Data stored as JSON.

## Structure
```
sade-begam/
├── vercel.json            # Vercel config (serves /public)
├── public/
│   ├── index.html         # Home — current news feed
│   ├── archive.html       # Archive — browse by day / week / month / year
│   ├── about.html         # About + non-profit imprint notice
│   ├── newsletter.html    # Email-only signup with confirmation step
│   ├── orders.html        # Request specific news (name / email / topic)
│   ├── css/style.css      # Brand Guide styles (blue #1A6FBF, orange #FF6B35, Vazirmatn)
│   ├── js/
│   │   ├── i18n.js        # Auto language (FA/EN) + shared Jalali date helpers + footer
│   │   ├── main.js        # Home feed: cards, source links, translations, client cache
│   │   └── archive.js     # Archive grouping (day/week/month/year), client cache
│   └── data/
│       ├── current-week.json   # Current items (reviewed before publishing)
│       ├── archive.json        # Published items archive (merged with current week)
│       └── sources.json        # Registry of official sources to monitor
├── agent/                 # Free daily RSS collector → draft for human review
├── social/               # Instagram daily-summary generator (post + caption)
└── .github/workflows/daily-update.yml   # Daily 01:00 Europe/London draft
```

## Dates
Every Gregorian date is shown next to the Persian (Jalali) date without the
year, e.g. `13 June · ۲۳ خرداد` — on news cards and in the footer of every page.

## Caching
News and translations are cached client-side (localStorage, stale-while-
revalidate, 1h) so repeat visits render instantly and save bandwidth.

## Instagram
`node social/generate-instagram.js` builds a 1080×1080 on-brand card
(`social/post-latest.html`) plus a ready caption (`social/caption-latest.txt`).
See [social/README.md](social/README.md).

## Language
Auto-detects the visitor: Persian (RTL) for Persian speakers, otherwise English. Manual switch in the header. Non-English quotes are shown in the original **plus** a translation.

## Free-only
No paid APIs. The planned weekly update (Saturday, Mon–Sun range) will use free tools (RSS / official press pages + GitHub Actions) with human review before publishing.

## Run locally
```
cd public && python3 -m http.server 3000
# open http://localhost:3000
```
