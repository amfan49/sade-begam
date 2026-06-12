# Sade Begam

**Official News. No Filter.** — Independent Persian news media that aggregates official statements about Iran from around the world. No interpretation, no rumors — every item links to its official source.

## Status
Test phase (private). Plain HTML/CSS/JS. Hosted free on Vercel. Data stored as JSON.

## Structure
```
sade-begam/
├── vercel.json            # Vercel config (serves /public)
├── public/
│   ├── index.html         # Home — current week's news feed
│   ├── css/style.css      # Brand Guide styles (light/clean)
│   ├── js/
│   │   ├── i18n.js        # Auto language: Persian for FA speakers, else English
│   │   └── main.js        # Loads JSON, renders cards + source links + translations
│   └── data/
│       ├── current-week.json   # Current week's items (sample data for now)
│       └── sources.json        # Registry of official sources to monitor
```

## Language
Auto-detects the visitor: Persian (RTL) for Persian speakers, otherwise English. Manual switch in the header. Non-English quotes are shown in the original **plus** a translation.

## Free-only
No paid APIs. The planned weekly update (Saturday, Mon–Sun range) will use free tools (RSS / official press pages + GitHub Actions) with human review before publishing.

## Run locally
```
cd public && python3 -m http.server 3000
# open http://localhost:3000
```
