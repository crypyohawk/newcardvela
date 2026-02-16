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

    // 获取卡片类型信息
    const card = await db.userCard.findUnique({
      where: { id: params.id },
      include: { 
        cardType: {
          select: {
            id: true,
            name: true,
            openFee: true,
            rechargeFeePercent: true,
            rechargeFeeMin: true,
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
          { error: `卡片状态为 ${cardInfo.status}，只有 ACTIVE 状态的卡才能充值` },
          { status: 400 }
        );
      }
    } catch (err: any) {
      console.error('查询卡状态失败:', err);
    }

    // 计算手续费：从充值金额中扣除
    const feePercent = card.cardType.rechargeFeePercent || 2;
    const feeMin = card.cardType.rechargeFeeMin || 0.5;
    const percentFee = amount * (feePercent / 100);
    const fee = Math.max(percentFee, feeMin);
    const cardReceive = amount - fee; // 卡实际到账金额

    if (cardReceive <= 0) {
      return NextResponse.json(
        { error: `充值金额太小，扣除手续费$${fee.toFixed(2)}后无法到账` },
        { status: 400 }
      );
    }

    // 检查余额：账户扣除 = 用户输入金额
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.balance < amount) {
      return NextResponse.json(
        { error: `账户余额不足，需要 $${amount.toFixed(2)}，当前余额 $${user?.balance.toFixed(2) || '0.00'}` },
        { status: 400 }
      );
    }

    // 调用上游充值接口：充入的是扣除手续费后的金额
    try {
      const result = await rechargeCard(card.gsalaryCardId, cardReceive);
      console.log('[充值结果]', { amount, fee, cardReceive, result });
    } catch (err: any) {
      console.error('上游充值失败:', err);
      return NextResponse.json({ error: `充值失败: ${err.message}` }, { status: 502 });
    }

    // 扣除用户账户余额 = 用户输入的金额
    await db.user.update({
      where: { id: payload.userId },
      data: { balance: { decrement: amount } },
    });

    // 增加卡余额 = 扣除手续费后的金额
    await db.userCard.update({
      where: { id: card.id },
      data: { balance: { increment: cardReceive } },
    });

    // 记录交易
    await db.transaction.create({
      data: {
        userId: payload.userId,
        type: 'card_recharge',
        amount: -amount,
        status: 'completed',
        txHash: JSON.stringify({
          cardId: card.id,
          inputAmount: amount,
          fee: fee,
          feePercent: feePercent,
          cardReceive: cardReceive,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `充值成功！扣除手续费$${fee.toFixed(2)}，卡实际到账$${cardReceive.toFixed(2)}`,
    });
  } catch (error: any) {
    console.error('卡充值失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
