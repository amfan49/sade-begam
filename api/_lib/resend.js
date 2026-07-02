// api/_lib/resend.js — shared Resend email helper (free tier, no SDK needed).
"use strict";

const https = require("https");

function sendResend(apiKey, body) {
  return new Promise((resolve, reject) => {
    const raw = JSON.stringify(body);
    const req = https.request({
      hostname: "api.resend.com",
      path: "/emails",
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(raw)
      }
    }, (r) => {
      let data = "";
      r.on("data", (c) => { data += c; });
      r.on("end", () => {
        if (r.statusCode >= 200 && r.statusCode < 300) resolve(data);
        else reject(new Error(`Resend ${r.statusCode}: ${data}`));
      });
    });
    req.on("error", reject);
    req.write(raw);
    req.end();
  });
}

module.exports = { sendResend };
