// 验证码内存存储（生产环境建议使用 Redis）
export const verificationCodes = new Map<string, { code: string; expiresAt: number; type: string }>();
