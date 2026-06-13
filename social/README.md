# Sade Begam — Instagram daily summary

A free, on-brand way to turn the day's published news into one Instagram post.
No paid tools. Neutral presentation, consistent design.

## How to use

1. Make sure `public/data/current-week.json` holds today's reviewed items.
2. Generate the post:
   ```
   node social/generate-instagram.js
   ```
   (Optional: `MAX=4 node social/generate-instagram.js` to limit headlines.)
3. Two files appear in this folder:
   - **post-latest.html** — open it in a browser. It's a fixed **1080×1080**
     card (the Instagram square). Screenshot just the card, or use the
     browser's "Capture node screenshot" on the `.card` element.
   - **caption-latest.txt** — copy this as the post caption.

## What each post contains (by design, every time)

- Persian headlines only (the day's official news).
- Today's **Gregorian date** (day month, e.g. `13 June`) plus the Persian date.
- A direct link to **sadebegam.com** for the full translation + official source.
- Brand colours (blue `#1A6FBF`, orange `#FF6B35`) and Vazirmatn — neutral,
  no commentary.

> The card is generated locally; nothing is auto-posted. You review, screenshot,
> and post manually.
