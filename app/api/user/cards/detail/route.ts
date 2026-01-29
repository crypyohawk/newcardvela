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
