import { createHash, randomBytes } from "node:crypto";

/** 计算公开访问密钥的不可逆哈希。 */
function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

/** 创建隐私邮箱公开邮件访问服务。 */
export function createPublicMailService({ config, repositories }) {
  /** 为邮箱生成或轮换一次性展示的公开访问密钥。 */
  function createAccess(addressId) {
    const address = repositories.getAddress(addressId);
    if (!address) throw Object.assign(new Error("邮箱不存在"), { status: 404 });
    const token = randomBytes(32).toString("base64url");
    repositories.savePublicAccess(addressId, hashToken(token));
    const encodedEmail = encodeURIComponent(address.email);
    return {
      token,
      apiUrl: `${config.appOrigin}/openapi/mail/${encodedEmail}/${token}/latest`,
      viewerUrl: `${config.appOrigin}/mail/${encodedEmail}/${token}`
    };
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

  return { createAccess, revokeAccess, getLatest };
}
