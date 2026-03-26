export const dynamic = 'force-dynamic';

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

    if (amount < 5) {
      return NextResponse.json({ error: '卡片充值金额不得低于 $5' }, { status: 400 });
    }

    // 获取卡片信息
    const card = await db.userCard.findUnique({
      where: { id: params.id },
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
            rechargeFeePercent: true,
            rechargeFeeMin: true,
          }
        }
      },
    });

    if (!card) {
      return NextResponse.json({ error: '卡片不存在' }, { status: 404 });
    }

    if (card.userId !== payload.userId) {
      return NextResponse.json({ error: '无权操作此卡片' }, { status: 403 });
    }

    if (!card.gsalaryCardId) {
      return NextResponse.json({ error: '卡片未激活，无法充值' }, { status: 400 });
    }

    // 查询上游卡状态
    try {
      const cardInfo = await getCardDetail(card.gsalaryCardId);
      if (cardInfo.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: `卡片状态为 ${cardInfo.status}，只有 ACTIVE 状态的卡才能充值` },
          { status: 400 }
        );
      }
    } catch (err: any) {
      console.error('查询卡状态失败:', err);
      return NextResponse.json({ error: '查询卡状态失败，请稍后重试' }, { status: 500 });
    }

    // 计算手续费
    const feePercent = card.cardType.rechargeFeePercent || 2;
    const feeMin = card.cardType.rechargeFeeMin || 0.5;
    const percentFee = amount * (feePercent / 100);
    const fee = Math.max(percentFee, feeMin);
    const cardReceive = Math.round((amount - fee) * 100) / 100; // 避免浮点精度问题

    if (cardReceive <= 0) {
      return NextResponse.json(
        { error: `充值金额太小，扣除手续费后无法到账` },
        { status: 400 }
      );
    }

    // ✅ 关键修复：使用原子操作，先扣款再充值
    // 第一步：在事务中检查余额并扣款（原子操作，防止并发）
    let txRecord;
    try {
      txRecord = await db.$transaction(async (tx) => {
        // 获取最新用户数据（事务内加锁）
        const freshUser = await tx.user.findUnique({
          where: { id: payload.userId },
        });

        if (!freshUser || freshUser.balance < amount) {
          throw new Error(
            `账户余额不足，需要 $${amount.toFixed(2)}，当前余额 $${freshUser?.balance.toFixed(2) || '0.00'}`
          );
        }

        // 立即扣款（在事务内，其他并发请求无法读取到旧余额）
        await tx.user.update({
          where: { id: payload.userId },
          data: { balance: { decrement: amount } },
        });

        // 创建交易记录（pending 状态，等上游确认）
        const record = await tx.transaction.create({
          data: {
            userId: payload.userId,
            type: 'card_recharge',
            amount: -amount,
            status: 'pending',
            txHash: JSON.stringify({
              cardId: card.id,
              inputAmount: amount,
              fee: fee,
              feePercent: feePercent,
              cardReceive: cardReceive,
            }),
          },
        });

        return record;
      });
    } catch (txError: any) {
      console.error('[卡充值] 扣款事务失败:', txError.message);
      return NextResponse.json(
        { error: txError.message },
        { status: 400 }
      );
    }

    console.log(`[卡充值] 扣款成功，交易ID: ${txRecord.id}，金额: $${amount}，用户: ${payload.userId}`);

    // 第二步：调用上游充值（此时用户余额已扣除）
    try {
      const result = await rechargeCard(card.gsalaryCardId, cardReceive);
      console.log('[卡充值] 上游充值成功:', { amount, fee, cardReceive, result });

      // 第三步：上游成功，更新卡余额和交易状态
      await db.$transaction([
        db.userCard.update({
          where: { id: card.id },
          data: { balance: { increment: cardReceive } },
        }),
        db.transaction.update({
          where: { id: txRecord.id },
          data: { status: 'completed' },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `充值成功！扣除手续费 $${fee.toFixed(2)}，卡实际到账 $${cardReceive.toFixed(2)}`,
        data: {
          amount,
          fee,
          cardReceive,
        },
      });

    } catch (upstreamError: any) {
      // ⚠️ 上游充值失败，需要退还用户余额
      console.error(`[卡充值] 上游充值失败，退还余额! 交易ID: ${txRecord.id}`, upstreamError);

      try {
        await db.$transaction([
          // 退还用户余额
          db.user.update({
            where: { id: payload.userId },
            data: { balance: { increment: amount } },
          }),
          // 标记交易为失败
          db.transaction.update({
            where: { id: txRecord.id },
            data: {
              status: 'failed',
              txHash: JSON.stringify({
                cardId: card.id,
                inputAmount: amount,
                fee: fee,
                cardReceive: cardReceive,
                error: upstreamError.message,
                refunded: true,
              }),
            },
          }),
        ]);
        console.log(`[卡充值] 余额已退还 $${amount}，用户: ${payload.userId}`);
      } catch (refundError: any) {
        // 退款也失败了，记录严重错误
        console.error(`[严重] 退款失败! 交易ID: ${txRecord.id}, 用户: ${payload.userId}, 金额: $${amount}`, refundError);
      }

      return NextResponse.json(
        { error: '充值到卡失败: ' + upstreamError.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('卡充值异常:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
