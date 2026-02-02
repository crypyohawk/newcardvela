import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';
import { rechargeCard, getCardDetail } from '../../../../../../src/lib/gsalary';

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
      return NextResponse.json({ error: '充值金额无效' }, { status: 400 });
    }

    // 获取卡片类型信息时，确保包含 rechargeFee
    const card = await db.userCard.findUnique({
      where: { id: params.id },
      include: { 
        cardType: {
          select: {
            id: true,
            name: true,
            openFee: true,
            rechargeFeePercent: true,  // 使用正确的字段名
          }
        } 
      },
    });

    if (!card) {
      return NextResponse.json({ error: '卡片不存在' }, { status: 404 });
    }

    if (!card.gsalaryCardId) {
      return NextResponse.json({ error: '卡片未激活，无法充值' }, { status: 400 });
    }

    // 先查询上游卡状态
    try {
      const cardInfo = await getCardDetail(card.gsalaryCardId);
      console.log('[卡状态]', cardInfo);

      if (cardInfo.status !== 'ACTIVE') {
        return NextResponse.json(
          {
            error: `卡片状态为 ${cardInfo.status}，只有 ACTIVE 状态的卡才能充值`,
          },
          { status: 400 }
        );
      }
    } catch (err: any) {
      console.error('查询卡状态失败:', err);
      // 继续尝试充值
    }

    // 使用正确的字段名
    const rechargeFee = amount * (card.cardType.rechargeFeePercent / 100);
    const fee = amount * rechargeFee;
    const totalCost = amount + fee;

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.balance < totalCost) {
      return NextResponse.json(
        {
          error: `账户余额不足，需要 $${totalCost.toFixed(2)}（含手续费）`,
        },
        { status: 400 }
      );
    }

    // 调用上游充值接口（金额单位：元，不是分！）
    try {
      const result = await rechargeCard(card.gsalaryCardId, amount);  // 直接传元
      console.log('[充值结果]', result);
    } catch (err: any) {
      console.error('上游充值失败:', err);
      return NextResponse.json({ error: `充值失败: ${err.message}` }, { status: 502 });
    }

    // 扣除用户平台账户余额
    await db.user.update({
      where: { id: payload.userId },
      data: { balance: { decrement: totalCost } },
    });

    // 增加卡余额
    await db.userCard.update({
      where: { id: card.id },
      data: { balance: { increment: amount } },
    });

    // 记录交易
    await db.transaction.create({
      data: {
        userId: payload.userId,
        type: 'card_recharge',
        amount: -totalCost,
        status: 'completed',
      },
    });

    return NextResponse.json({
      success: true,
      message: '充值成功',
    });
  } catch (error: any) {
    console.error('卡充值失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
