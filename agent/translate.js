// translate.js — free Persian translation via MyMemory API
// No API key needed. Limit: ~50 000 words/day with email param.
// Silently returns null on failure so approve.js can still proceed.

const https = require("https");

function translateText(text, from = "en", to = "fa") {
  return new Promise((resolve) => {
    if (!text || !text.trim()) return resolve(null);
    // MyMemory max 500 chars per request
    const q = encodeURIComponent(text.slice(0, 500));
    const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${from}%7C${to}&de=amfan49%40gmail.com`;
    https.get(url, { timeout: 10000 }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(raw);
          if (json.responseStatus === 200 && json.responseData?.translatedText) {
            resolve(json.responseData.translatedText);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null))
      .on("timeout", function () { this.destroy(); resolve(null); });
  });
}

module.exports = { translateText };
