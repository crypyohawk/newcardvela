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

    const card = await db.userCard.findUnique({
      where: { id: params.id },
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
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
      return NextResponse.json({ error: '卡片未激活' }, { status: 400 });
    }

    // ✅ 修复：获取系统设置
    let settings;
    try {
      settings = await db.systemSettings.findFirst();
    } catch (e) {
      console.error('获取系统设置失败:', e);
    }

    const feePercent = settings?.cardWithdrawFeePercent ?? 1;
    const feeMin = settings?.cardWithdrawFeeMin ?? 1;
    const fee = Math.max(amount * (feePercent / 100), feeMin);
    const userReceive = Math.round((amount - fee) * 100) / 100;

    // ✅ 修复：先检查手续费，避免无意义的上游请求
    if (userReceive <= 0) {
      return NextResponse.json(
        { error: `提现金额太小，扣除手续费 $${fee.toFixed(2)} 后无法到账` },
        { status: 400 }
      );
    }

    // ✅ 修复：查询上游卡余额，失败必须 return
    let cardBalance: number;
    try {
      const cardInfo = await getCardDetail(card.gsalaryCardId);
      cardBalance = parseFloat(cardInfo.balance || '0');

      if (cardInfo.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: `卡片状态为 ${cardInfo.status}，无法提现` },
          { status: 400 }
        );
      }

      if (cardBalance < amount) {
        return NextResponse.json(
          { error: `卡片余额不足，当前余额 $${cardBalance.toFixed(2)}` },
          { status: 400 }
        );
      }
    } catch (err: any) {
      console.error('查询卡余额失败:', err);
      // ✅ 修复：必须 return，不能继续
      return NextResponse.json(
        { error: '查询卡余额失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 第一步：调用上游提现（从卡里扣钱）
    let withdrawResult;
    try {
      withdrawResult = await withdrawFromCard(card.gsalaryCardId, amount); // ✅ 修复
      console.log('[卡提现] 上游提现成功:', { amount, fee, userReceive, withdrawResult });
    } catch (err: any) {
      console.error('[卡提现] 上游提现失败:', err);
      return NextResponse.json(
        { error: '提现失败: ' + err.message },
        { status: 500 }
      );
    }

    // 第二步：上游成功后，事务内更新所有数据
    try {
      await db.$transaction([
        // 增加用户余额（到账金额）
        db.user.update({
          where: { id: payload.userId },
          data: { balance: { increment: userReceive } },
        }),
        // 减少本地卡余额
        db.userCard.update({
          where: { id: card.id },
          data: { balance: { decrement: amount } },
        }),
        // 创建交易记录
        db.transaction.create({
          data: {
            userId: payload.userId,
            type: 'card_withdraw',
            amount: userReceive,
            status: 'completed',
            txHash: JSON.stringify({
              cardId: card.id,
              withdrawAmount: amount,
              fee: fee,
              feePercent: feePercent,
              userReceive: userReceive,
            }),
          },
        }),
      ]);
    } catch (dbError: any) {
      // 上游已经扣了钱但数据库失败，记录严重错误
      console.error(`[严重] 上游提现成功但数据库更新失败! 卡: ${card.id}, 金额: $${amount}`, dbError);
      return NextResponse.json(
        { error: '提现处理异常，请联系客服' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `提现成功！扣除手续费 $${fee.toFixed(2)}，账户到账 $${userReceive.toFixed(2)}`,
      data: {
        amount,
        fee,
        userReceive,
      },
    });

  } catch (error: any) {
    console.error('卡提现异常:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
