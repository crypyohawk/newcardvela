// 使用 global 确保在开发模式下不会被重置
const globalForCodes = globalThis as unknown as {
  verificationCodes: Map<string, { code: string; expires: number }>;
};

if (!globalForCodes.verificationCodes) {
  globalForCodes.verificationCodes = new Map();
}

const verificationCodes = globalForCodes.verificationCodes;

export function setCode(email: string, code: string) {
  console.log('[验证码] 存储:', email.toLowerCase(), code);
  verificationCodes.set(email.toLowerCase(), {
    code,
    expires: Date.now() + 5 * 60 * 1000, // 5分钟有效
  });
}

export function verifyCode(email: string, code: string): boolean {
  const emailLower = email.toLowerCase();
  const record = verificationCodes.get(emailLower);

  console.log('[验证码] 验证:', emailLower, '输入:', code, '存储:', record);

  if (!record) {
    console.log('[验证码] 未找到记录');
    return false;
  }
  if (Date.now() > record.expires) {
    console.log('[验证码] 已过期');
    verificationCodes.delete(emailLower);
    return false;
  }
  if (record.code !== code) {
    console.log('[验证码] 不匹配');
    return false;
  }

  console.log('[验证码] 验证成功');
  verificationCodes.delete(emailLower);
  return true;
}

export function getCode(email: string): string | null {
  const record = verificationCodes.get(email.toLowerCase());
  if (!record || Date.now() > record.expires) return null;
  return record.code;
}
