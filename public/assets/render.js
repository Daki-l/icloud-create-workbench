/** 对插入 HTML 的文本进行转义。 */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

/** 格式化日期时间。 */
export function formatTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Shanghai"
  }).format(new Date(value));
}

/** 计算冷却倒计时文本。 */
export function cooldownText(value) {
  const remaining = new Date(value || 0).getTime() - Date.now();
  if (remaining <= 0) return "当前可生成";
  const minutes = Math.ceil(remaining / 60_000);
  return `冷却中，约 ${minutes} 分钟后可再次生成`;
}

/** 渲染多 CK 账号卡片。 */
export function renderAccounts(accounts) {
  return accounts.map(account => `
    <article class="account-card" data-account-id="${escapeHtml(account.id)}">
      <div class="card-head"><span class="status-dot"></span><span class="pill">${escapeHtml(account.status === "expired" ? "CK 已过期" : "CK 有效")}</span></div>
      <h3>${escapeHtml(account.appleIdMasked)}</h3><p class="muted">${escapeHtml(account.displayName || "未命名账号")}</p>
      <div class="stats"><div><strong>${account.addressCount || 0}</strong><span>邮箱总数</span></div><div><strong>${account.unusedCount || 0}</strong><span>未使用</span></div></div>
      <p class="cooldown">${escapeHtml(cooldownText(account.cooldownUntil))}</p>
      <button class="secondary full" data-action="detail">进入工作台</button>
    </article>`).join("");
}

/** 渲染账号基础信息。 */
export function renderAccountMeta(account) {
  const items = [["CK 状态", account.status === "expired" ? "已过期" : "有效"], ["区域", account.region === "china" ? "中国区" : "全球区"], ["用户分区", account.userPartition || "—"], ["Maildomain", account.maildomainHost || "—"], ["最近检测", formatTime(account.lastCheckedAt)]];
  return items.map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

/** 渲染隐藏邮箱表格。 */
export function renderAddresses(addresses) {
  if (!addresses.length) return `<tr><td colspan="7" class="empty">暂无隐藏邮箱</td></tr>`;
  const labels = { unused: "未使用", used: "已使用", trash: "垃圾箱" };
  return addresses.map(item => `<tr data-address-id="${escapeHtml(item.id)}"><td><input type="checkbox" data-address-select value="${escapeHtml(item.id)}"></td><td><button class="copy-email" data-email="${escapeHtml(item.email)}">${escapeHtml(item.email)}</button></td><td>${escapeHtml(item.appleIdMasked || "—")}</td><td>${escapeHtml(item.label || "—")}</td><td><select data-state><option value="unused" ${item.state === "unused" ? "selected" : ""}>未使用</option><option value="used" ${item.state === "used" ? "selected" : ""}>已使用</option><option value="trash" ${item.state === "trash" ? "selected" : ""}>垃圾箱</option></select><span class="sr-only">${labels[item.state]}</span></td><td>${item.source === "generated" ? "本地生成" : "Apple 同步"}</td><td>${formatTime(item.createdAt)}</td></tr>`).join("");
}

/** 渲染持续生产目标、进度和控制按钮。 */
export function renderCampaigns(campaigns) {
  if (!campaigns.length) return `<div class="empty">暂无生产目标</div>`;
  const names = { running: "运行中", stopped: "已停止", completed: "已完成" };
  return campaigns.map(item => {
    const percent = Math.min(100, Math.round(Number(item.currentTotal || 0) / Number(item.targetTotal || 1) * 100));
    const action = item.status === "running"
      ? `<button class="danger" data-campaign-stop="${escapeHtml(item.id)}">停止</button>`
      : item.status === "stopped" ? `<button class="secondary" data-campaign-resume="${escapeHtml(item.id)}">继续</button>` : "";
    return `<article class="campaign-item"><div class="section-head"><div><strong>${escapeHtml(item.appleIdMasked)}</strong><p class="muted">目标 ${item.targetTotal} · 每批 ${item.batchSize} · 本任务新增 ${item.generatedCount}</p></div><span class="pill ${item.status}">${names[item.status] || item.status}</span></div><progress class="progress" value="${Number(item.currentTotal || 0)}" max="${Number(item.targetTotal || 1)}"></progress><div class="campaign-foot"><span>库存 ${item.currentTotal}/${item.targetTotal}（${percent}%）</span><span>${item.status === "running" ? `下批：${formatTime(item.nextRunAt)}` : ""}</span>${action}</div>${item.lastError ? `<p class="error-text">${escapeHtml(item.lastError)}</p>` : ""}</article>`;
  }).join("");
}

/** 渲染通用分页按钮。 */
export function renderPagination(pagination, kind) {
  if (!pagination || pagination.totalPages <= 1) return "";
  return `<button class="ghost" data-page-kind="${kind}" data-page="${pagination.page - 1}" ${pagination.page <= 1 ? "disabled" : ""}>上一页</button><span>第 ${pagination.page}/${pagination.totalPages} 页，共 ${pagination.total} 条</span><button class="ghost" data-page-kind="${kind}" data-page="${pagination.page + 1}" ${pagination.page >= pagination.totalPages ? "disabled" : ""}>下一页</button>`;
}

/** 渲染生成任务及逐条结果。 */
export function renderJobs(jobs) {
  if (!jobs.length) return `<div class="empty">暂无生成记录</div>`;
  const names = { queued: "等待", running: "运行中", partial: "部分成功", success: "成功", failed: "失败" };
  return jobs.map(job => `<article class="job-item"><div class="section-head"><div><strong>${escapeHtml(job.appleIdMasked || "当前账号")}</strong><p class="muted">${formatTime(job.createdAt)} · 请求 ${job.requestedCount} 个</p></div><span class="pill ${job.status}">${names[job.status] || job.status}</span></div>${(job.results || []).map(result => `<div class="job-result"><span>${escapeHtml(result.label)}</span><span>${escapeHtml(result.email || result.error || "")}</span></div>`).join("")}</article>`).join("");
}

/** 渲染收件与验证码列表。 */
export function renderMessages(messages) {
  if (!messages.length) return `<div class="empty">暂无同步邮件</div>`;
  return messages.map(message => `<article class="message-item"><div><strong>${escapeHtml(message.subject || "无主题")}</strong><p class="muted">${escapeHtml(message.sender || "未知发件人")} · ${formatTime(message.receivedAt)}</p><p>${escapeHtml(message.preview || "")}</p></div>${message.code ? `<button class="code" data-code="${escapeHtml(message.code)}">${escapeHtml(message.code)}</button>` : ""}</article>`).join("");
}
