import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from "node:crypto";
import jwt from "jsonwebtoken";

/** 使用 scrypt 生成可存入环境变量的密码哈希。 */
export function hashPassword(password, salt = randomBytes(16)) {
  const derived = scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

/** 使用恒定时间比较校验管理员密码。 */
export function verifyPassword(password, encodedHash) {
  try {
    const [scheme, saltText, expectedText] = String(encodedHash).split("$");
    if (scheme !== "scrypt" || !saltText || !expectedText) return false;
    const expected = Buffer.from(expectedText, "base64");
    const actual = scryptSync(String(password), Buffer.from(saltText, "base64"), expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** 使用恒定时间比较校验环境变量中的明文管理员密码。 */
export function verifyPlainPassword(password, expectedPassword) {
  const actual = Buffer.from(String(password));
  const expected = Buffer.from(String(expectedPassword));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** 将 Base64 密钥转换为固定 32 字节 AES 密钥。 */
function decodeEncryptionKey(encodedKey) {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY 必须是 32 字节 Base64 密钥");
  return key;
}

/** 使用 AES-256-GCM 加密敏感文本。 */
export function encryptSecret(plaintext, encodedKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeEncryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

/** 解密并验证 AES-256-GCM 密文。 */
export function decryptSecret(payload, encodedKey) {
  const [version, ivText, tagText, ciphertextText] = String(payload).split(".");
  if (version !== "v1") throw new Error("不支持的密文版本");
  const decipher = createDecipheriv("aes-256-gcm", decodeEncryptionKey(encodedKey), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64")), decipher.final()]).toString("utf8");
}

/** 签发管理员 JWT。 */
export function signAdminToken(config) {
  return jwt.sign({ role: "admin" }, config.jwtSecret, {
    algorithm: "HS256",
    subject: config.adminUsername,
    expiresIn: config.jwtExpiresIn,
    issuer: "icloud-create-workbench"
  });
}

/** 校验管理员 JWT。 */
export function verifyAdminToken(token, config) {
  return jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"],
    issuer: "icloud-create-workbench",
    subject: config.adminUsername
  });
}

/** 返回统一的会话 Cookie 配置。 */
export function sessionCookieOptions(config) {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: config.cookieSecure,
    path: "/",
    maxAge: 8 * 60 * 60 * 1000
  };
}
