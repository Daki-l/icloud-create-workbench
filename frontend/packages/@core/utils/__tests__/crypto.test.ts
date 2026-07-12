import { describe, expect, it } from 'vitest';
import { Crypto } from '../src/crypto';

describe('Crypto', () => {
  const secret = 'test-secret-key';
  const crypto = new Crypto<{ age: number; name: string }>(secret);

  it('加密后应返回非空字符串', () => {
    const encrypted = crypto.encrypt({ name: 'Alice', age: 30 });
    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe('string');
  });

  it('加密后解密应还原原始数据', () => {
    const data = { name: 'Bob', age: 25 };
    const encrypted = crypto.encrypt(data);
    const decrypted = crypto.decrypt(encrypted);
    expect(decrypted).toEqual(data);
  });

  it('不同密钥应无法解密', () => {
    const data = { name: 'Charlie', age: 20 };
    const encrypted = crypto.encrypt(data);

    const wrongCrypto = new Crypto<{ age: number; name: string }>('wrong-key');
    const decrypted = wrongCrypto.decrypt(encrypted);
    expect(decrypted).toBeNull();
  });

  it('无效密文应返回 null', () => {
    const result = crypto.decrypt('invalid-encrypted-string');
    expect(result).toBeNull();
  });

  it('空字符串应返回 null', () => {
    const result = crypto.decrypt('');
    expect(result).toBeNull();
  });
});
