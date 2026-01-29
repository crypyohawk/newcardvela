import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';
import { sendVerificationCode } from '../../../../../src/lib/email';
import crypto from 'crypto';

// 内存验证码存储（生产改用 Redis）
const verifyCodes = new Map<string, { code: string; expires: number; userId: string }>();
export { verifyCodes };

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 });
    }

    const body = await request.json();
    const { cardId } = body;

    if (!cardId) {
      return NextResponse.json({ error: 'cardId 必填' }, { status: 400 });
    }

    // 获取用户信息
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.email) {
      return NextResponse.json({ error: '用户邮箱未设置' }, { status: 400 });
    }

    // 验证卡片属于当前用户
    const card = await db.userCard.findFirst({
      where: { id: cardId, userId: payload.userId },
    });

    if (!card) {
      return NextResponse.json({ error: '卡片不存在' }, { status: 404 });
    }

    // 生成 6 位验证码，有效期 10 分钟
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = Date.now() + 10 * 60 * 1000;
    verifyCodes.set(cardId, { code, expires, userId: payload.userId });

    // 发送邮件
    try {
      await sendVerificationCode(user.email, code);
    } catch (mailErr: any) {
      console.error('[邮件发送失败]', mailErr);

      // 如果邮件发送失败，开发模式下返回验证码便于测试
      if (process.env.NODE_ENV !== 'production') {
        console.log('[开发模式] 验证码:', code);
        return NextResponse.json({
          success: true,
          message: '邮件发送失败，已在终端打印验证码（开发模式）',
          devCode: code,
        });
      }

      throw mailErr;
    }

    return NextResponse.json({
      success: true,
      message: `验证码已发送到 ${user.email}`,
    });
  } catch (error: any) {
    console.error('发送验证码失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
