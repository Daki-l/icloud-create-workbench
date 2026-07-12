import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret, hashPassword, maskAppleId, verifyPassword } from "../src/security.mjs";

test("scrypt 密码哈希可以验证正确密码并拒绝错误密码", () => {
  const hash = hashPassword("a-very-strong-password");
  assert.equal(verifyPassword("a-very-strong-password", hash), true);
  assert.equal(verifyPassword("wrong-password", hash), false);
});

test("AES-256-GCM 可以解密原文并拒绝篡改密文", () => {
  const key = randomBytes(32).toString("base64");
  const encrypted = encryptSecret("X-APPLE-SECRET=value", key);
  assert.equal(decryptSecret(encrypted, key), "X-APPLE-SECRET=value");
  assert.throws(() => decryptSecret(`${encrypted.slice(0, -2)}AA`, key));
});

test("Apple ID 只返回脱敏形式", () => {
  assert.equal(maskAppleId("someone@example.com"), "so***@example.com");
});
