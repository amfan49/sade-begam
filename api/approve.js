// api/approve.js — Vercel serverless function
// GET /api/approve?token=SECRET&id=draft-001
//
// Verifies the secret token, then calls the GitHub API to trigger the
// "approve-single" workflow, which runs approve.js and pushes the result.
//
// Env vars (set in Vercel dashboard):
//   APPROVE_SECRET  — same random string stored in GitHub Actions secret
//   GH_PAT          — GitHub Personal Access Token with "workflow" scope

const https = require("https");

const REPO = "amfan49/sade-begam";
const WORKFLOW_FILE = "approve-single.yml";

module.exports = async (req, res) => {
  const { token, id } = req.query || {};

  if (!token || token !== process.env.APPROVE_SECRET) {
    return res.status(403).send(page("403 Forbidden", "توکن اشتباه است.", "#e74c3c"));
  }

  // Ping endpoint — used by admin page to validate token without side effects
  if (id === "__ping__") {
    return res.status(200).json({ ok: true });
  }

  if (!id || (!id.startsWith("draft-") && id !== "all")) {
    return res.status(400).send(page("400 Bad Request", "شناسه خبر نامعتبر است.", "#e74c3c"));
  }

  const ghPat = process.env.GH_PAT;
  if (!ghPat) {
    return res.status(500).send(page("500 Server Error", "GH_PAT تنظیم نشده است.", "#e74c3c"));
  }

  const body = JSON.stringify({ ref: "main", inputs: { item_id: id } });

  try {
    const status = await callGitHub(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      "POST",
      ghPat,
      body
    );

    if (status === 204) {
      if (req.query.format === "json") {
        return res.status(200).json({ ok: true, id });
      }
      return res.status(200).send(
        page(
          "✅ در حال انتشار",
          `خبر <strong>${id}</strong> در حال انتشار است.<br>
           در عرض ۲–۳ دقیقه روی سایت ظاهر می‌شود.`,
          "#27ae60",
          `<a href="https://sade-begam.vercel.app"
              style="display:inline-block;margin-top:20px;background:#1A6FBF;color:#fff;
                     text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;">
             → رفتن به سایت
           </a>`
        )
      );
    } else {
      return res.status(500).send(
        page("خطا", `GitHub پاسخ داد: ${status}`, "#e74c3c")
      );
    }
  } catch (err) {
    return res.status(500).send(page("خطا", err.message, "#e74c3c"));
  }
};

function callGitHub(url, method, token, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "sade-begam-approve-fn"
      }
    };
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, ...opts },
      (r) => { r.resume(); resolve(r.statusCode); }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function page(title, msg, color, extra = "") {
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
    h1{color:${color};margin:0 0 12px;}
    p{color:#444;line-height:1.6;margin:0;}
  </style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    <p>${msg}</p>
    ${extra}
  </div>
</body>
</html>`;
}
