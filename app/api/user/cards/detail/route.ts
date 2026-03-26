export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';
import { getCardSensitiveInfo } from '../../../../../src/lib/gsalary';

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
    const { cardId, verifyCode } = body;

    const card = await db.userCard.findFirst({
      where: { id: cardId, userId: payload.userId },
    });

    if (!card) {
      return NextResponse.json({ error: '卡片不存在' }, { status: 404 });
    }

    if (!card.gsalaryCardId) {
      return NextResponse.json({ error: '卡片未激活' }, { status: 400 });
    }

    // 检查该卡是否已完成首次充值（至少 $5）
    const completedRecharge = await db.transaction.findFirst({
      where: {
        userId: payload.userId,
        type: 'card_recharge',
        status: 'completed',
        txHash: { contains: `"cardId":"${card.id}"` },
      },
    });

    if (!completedRecharge) {
      return NextResponse.json(
        { error: '请先为该卡充值至少 $5 后才能查看卡片信息', code: 'NEED_FIRST_RECHARGE' },
        { status: 403 }
      );
    }

    // 获取敏感信息
    const sensitiveInfo = await getCardSensitiveInfo(card.gsalaryCardId);

    // 构造有效期格式 MM/YY
    const expiry = sensitiveInfo.expire_month && sensitiveInfo.expire_year
      ? `${sensitiveInfo.expire_month}/${sensitiveInfo.expire_year.slice(-2)}`
      : '';

    return NextResponse.json({
      detail: {
        cardNo: sensitiveInfo.pan || '',
        cvv: sensitiveInfo.cvv || '',
        expiry: expiry,
      },
    });
  } catch (error: any) {
    console.error('获取卡片详情失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
