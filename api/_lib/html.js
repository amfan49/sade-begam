// api/_lib/html.js — shared branded result page for API endpoints that a
// human lands on from an email link (approve, confirm, unsubscribe).
"use strict";

function htmlPage(title, msg, color, extra = "") {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    body{margin:0;background:#F5F7FA;display:flex;align-items:center;
         justify-content:center;min-height:100vh;font-family:Tahoma,Arial,sans-serif;}
    .box{background:#fff;border-radius:14px;padding:40px 48px;text-align:center;
         box-shadow:0 4px 24px rgba(0,0,0,.1);max-width:420px;}
    h1{color:${color};margin:0 0 12px;} p{color:#444;line-height:1.6;margin:0 0 18px;}
    .box > a{display:inline-block;background:#1A6FBF;color:#fff;text-decoration:none;
      padding:10px 24px;border-radius:8px;font-size:14px;}
  </style>
</head>
<body><div class="box"><h1>${title}</h1><p>${msg}</p>${extra}
<a href="https://sade-begam.vercel.app">→ ساده بگم</a></div></body>
</html>`;
}

module.exports = { htmlPage };
