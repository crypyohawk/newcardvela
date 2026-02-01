// 验证码内存存储
// 使用 global 防止热重载时丢失数据
const globalForCodes = globalThis as unknown as {
  verificationCodes: Map<string, { code: string; expiresAt: number }>;
};

const codes = globalForCodes.verificationCodes || new Map<string, { code: string; expiresAt: number }>();

if (!globalForCodes.verificationCodes) {
  globalForCodes.verificationCodes = codes;
}

export function setCode(email: string, code: string) {
  const emailLower = email.toLowerCase();
  codes.set(emailLower, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  console.log('[验证码] 存储:', emailLower, code, '当前存储数量:', codes.size);
}

export function verifyCode(email: string, code: string): boolean {
  const emailLower = email.toLowerCase();
  const stored = codes.get(emailLower);

  console.log('[验证码] 验证:', {
    email: emailLower,
    inputCode: code,
    storedCode: stored?.code,
    exists: !!stored,
    expired: stored ? stored.expiresAt < Date.now() : null,
    mapSize: codes.size,
  });

  if (!stored) return false;
  if (stored.expiresAt < Date.now()) {
    codes.delete(emailLower);
    return false;
  }
  if (stored.code !== code) return false;

  codes.delete(emailLower);
  return true;
}

export function getCode(email: string): string | null {
  const stored = codes.get(email.toLowerCase());
  if (!stored || stored.expiresAt < Date.now()) return null;
  return stored.code;
}
