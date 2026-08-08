import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

/** 转义 HTML 文本节点。 */
function escapeText(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 转义 HTML 属性值（用于 iframe srcdoc）。 */
function escapeAttr(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 渲染自包含的公开邮件 HTML 页面。 */
function renderMailHtml({ email, message }) {
  const esc = escapeText;
  if (!message) {
    return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(email)}</title>
<style>:root{color-scheme:light}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f}.wrap{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px}.card{max-width:480px;width:100%;background:#fff;border-radius:16px;padding:40px 28px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.08)}h1{font-size:17px;margin:0 0 8px}p{margin:0;color:#8e8e93;font-size:14px;word-break:break-all}</style></head>
<body><div class="wrap"><div class="card"><h1>暂未收到邮件</h1><p>${esc(email)}</p></div></div></body></html>`;
  }
  const { subject, sender, code, bodyHtml, bodyText, receivedAt } = message;
  const time = receivedAt ? new Date(receivedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "-";
  const codeChip = code
    ? `<span class="chip"><span class="chip-label">验证码</span><span class="chip-code">${esc(code)}</span></span>`
    : "";
  const body = bodyHtml
    ? `<iframe title="邮件正文" sandbox="" srcdoc="${escapeAttr(bodyHtml)}"></iframe>`
    : `<div class="empty">无 HTML 正文</div><pre class="text">${esc(bodyText || "")}</pre>`;
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject || email)}</title>
<style>
:root{color-scheme:light}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f}
.bar{position:sticky;top:0;z-index:1;background:#fff;border-bottom:1px solid #e5e5ea;padding:12px 16px}
.bar h1{font-size:15px;margin:0 0 6px;line-height:1.4;word-break:break-word}
.meta{font-size:13px;color:#6e6e80;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.meta span{white-space:nowrap}
.chip{display:inline-flex;align-items:center;gap:6px;background:#eaf4ff;border-radius:8px;padding:4px 10px}
.chip-label{color:#6e6e80;font-size:12px}
.chip-code{color:#0074e8;font-weight:700;font-family:Menlo,Monaco,monospace;font-size:15px;letter-spacing:.5px}
.frame-wrap{max-width:760px;margin:16px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
iframe{width:100%;height:calc(100dvh - 96px);border:0;display:block;background:#fff}
.empty{padding:40px;text-align:center;color:#8e8e93}
.text{white-space:pre-wrap;word-break:break-word;padding:20px;font-family:inherit;margin:0}
</style></head>
<body>
<div class="bar">
<h1>${esc(subject || "无主题")}</h1>
<div class="meta">
<span>收件：${esc(email)}</span>
<span>发件人：${esc(sender || "-")}</span>
<span>${esc(time)}</span>
${codeChip}
</div>
</div>
<div class="frame-wrap">${body}</div>
</body></html>`;
}

/** 创建无管理员会话的公开最新邮件接口。 */
export function createPublicMailRouter(config, publicMailService) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: config.publicMailRateLimit,
    keyGenerator: req => `${ipKeyGenerator(req.ip)}:${req.params.token || "anonymous"}`,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "请求过于频繁" }
  });

  /** 为只读公开接口设置跨域和禁用缓存响应头。 */
  router.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  /** 浏览器打开返回渲染好的 HTML 页面，?format=json 返回原始 JSON。 */
  router.get("/mail/:email/:token/latest", limiter, (req, res) => {
    const result = publicMailService.getLatest(req.params.email, req.params.token);
    if (!result) return res.status(404).json({ error: "邮件地址或访问密钥无效" });
    if (req.query.format === "json") return res.json(result);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderMailHtml(result));
  });
  return router;
}
