import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';
import { withdrawFromCard, getCardDetail } from '../../../../../../src/lib/gsalary';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '提现金额无效' }, { status: 400 });
    }

    const card = await db.userCard.findFirst({
      where: { id: params.id, userId: payload.userId },
    });

    if (!card) {
      return NextResponse.json({ error: '卡片不存在' }, { status: 404 });
    }

    if (!card.gsalaryCardId) {
      return NextResponse.json({ error: '卡片未激活' }, { status: 400 });
    }

    // 先查询上游卡的真实余额
    let upstreamBalance = 0;
    try {
      const cardInfo = await getCardDetail(card.gsalaryCardId);
      upstreamBalance = cardInfo.available_balance || 0;
      console.log('[卡真实余额]', upstreamBalance);

      if (upstreamBalance < amount) {
        return NextResponse.json(
          {
            error: `卡片余额不足，当前余额 $${upstreamBalance.toFixed(2)}`,
          },
          { status: 400 }
        );
      }
    } catch (err: any) {
      console.error('查询卡余额失败:', err);
    }

    // 调用上游提现接口（金额单位：元，type: DECREASE）
    try {
      const result = await withdrawFromCard(card.gsalaryCardId, amount);
      console.log('[提现结果]', result);
    } catch (err: any) {
      console.error('上游提现失败:', err);
      return NextResponse.json({ error: `提现失败: ${err.message}` }, { status: 502 });
    }

    // 更新本地数据库
    // 减少卡余额
    await db.userCard.update({
      where: { id: card.id },
      data: { balance: { decrement: amount } },
    });

    // 增加用户账户余额
    await db.user.update({
      where: { id: payload.userId },
      data: { balance: { increment: amount } },
    });

    // 记录交易
    await db.transaction.create({
      data: {
        userId: payload.userId,
        type: 'card_withdraw',
        amount: amount,
        status: 'completed',
      },
    });

    return NextResponse.json({
      success: true,
      message: '提现成功',
    });
  } catch (error: any) {
    console.error('卡提现失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
