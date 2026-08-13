import { createHash, randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret } from "../security.mjs";

/** 计算公开访问密钥的不可逆哈希。 */
function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

/** 创建隐私邮箱公开邮件访问服务。 */
export function createPublicMailService({ config, repositories }) {
  /** 为邮箱生成或轮换公开访问密钥，明文加密入库，便于后续查看。 */
  function createAccess(addressId) {
    const address = repositories.getAddress(addressId);
    if (!address) throw Object.assign(new Error("邮箱不存在"), { status: 404 });
    const token = randomBytes(32).toString("base64url");
    repositories.savePublicAccess(addressId, hashToken(token), encryptSecret(token, config.encryptionKey));
    const encodedEmail = encodeURIComponent(address.email);
    return {
      token,
      apiUrl: `${config.appOrigin}/openapi/mail/${encodedEmail}/${token}/latest`,
      listApiUrl: `${config.appOrigin}/openapi/mail/${encodedEmail}/${token}/list`,
      viewerUrl: `${config.appOrigin}/mail/${encodedEmail}/${token}`
    };
  }

  /** 查看邮箱已存在的公开访问链接，不轮换；旧链接（无加密密钥）或不存在返回 null。 */
  function getAccess(addressId) {
    const address = repositories.getAddress(addressId);
    if (!address) throw Object.assign(new Error("邮箱不存在"), { status: 404 });
    const row = repositories.getPublicAccessInternal(addressId);
    if (!row || !row.token_encrypted) return null;
    const token = decryptSecret(row.token_encrypted, config.encryptionKey);
    const encodedEmail = encodeURIComponent(address.email);
    return {
      token,
      apiUrl: `${config.appOrigin}/openapi/mail/${encodedEmail}/${token}/latest`,
      listApiUrl: `${config.appOrigin}/openapi/mail/${encodedEmail}/${token}/list`,
      viewerUrl: `${config.appOrigin}/mail/${encodedEmail}/${token}`,
      createdAt: row.created_at
    };
  }

  /** 批量为已选邮箱确保公开访问：未开放则创建，已有可解密则复用，旧链接跳过。 */
  function batchEnsureAccess(ids) {
    const results = [];
    const skipped = [];
    for (const id of ids) {
      const address = repositories.getAddress(id);
      if (!address) continue;
      const row = repositories.getPublicAccessInternal(id);
      if (row && row.token_encrypted) {
        const token = decryptSecret(row.token_encrypted, config.encryptionKey);
        const encodedEmail = encodeURIComponent(address.email);
        results.push({
          id,
          email: address.email,
          apiUrl: `${config.appOrigin}/openapi/mail/${encodedEmail}/${token}/latest`,
          listApiUrl: `${config.appOrigin}/openapi/mail/${encodedEmail}/${token}/list`,
          viewerUrl: `${config.appOrigin}/mail/${encodedEmail}/${token}`
        });
      } else if (!row) {
        const created = createAccess(id);
        results.push({ id, email: address.email, apiUrl: created.apiUrl, listApiUrl: created.listApiUrl, viewerUrl: created.viewerUrl });
      } else {
        skipped.push({ id, email: address.email });
      }
    }
    return { results, skipped };
  }

  /** 撤销指定邮箱的公开访问。 */
  function revokeAccess(addressId) {
    if (!repositories.getAddress(addressId)) throw Object.assign(new Error("邮箱不存在"), { status: 404 });
    repositories.revokePublicAccess(addressId);
    return { ok: true };
  }

  /** 使用邮箱和公开密钥读取最新邮件。 */
  function getLatest(email, token) {
    if (!email || !token || String(token).length < 32) return null;
    return repositories.getLatestPublicMail(email, hashToken(token));
  }

  /** 使用邮箱和公开密钥分页读取全部邮件（含正文）。 */
  function getList(email, token, page, pageSize) {
    if (!email || !token || String(token).length < 32) return null;
    return repositories.pagePublicMail(email, hashToken(token), page, pageSize);
  }

  return { createAccess, getAccess, batchEnsureAccess, revokeAccess, getLatest, getList };
}
