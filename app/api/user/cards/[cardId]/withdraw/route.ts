import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';

// 计算卡片提现到账户手续费（阶梯收费）
function calculateCardWithdrawFee(amount: number): number {
  if (amount < 50) return 1;      // 低于50扣1
  if (amount < 100) return 2;     // 50-100扣2
  if (amount < 200) return 4;     // 100-200扣4
  return 10;                      // 超过200扣10
}

export async function POST(
  request: NextRequest,
  { params }: { params: { cardId: string } }
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

    const { cardId } = params;
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '请输入有效的提现金额' }, { status: 400 });
    }

    // 查找卡片
    const card = await db.card.findFirst({
      where: { id: cardId, userId: payload.userId },
    });

    if (!card) {
      return NextResponse.json({ error: '卡片不存在' }, { status: 404 });
    }

    if (card.balance < amount) {
      return NextResponse.json({ error: '卡片余额不足' }, { status: 400 });
    }

    // 计算手续费（阶梯收费）
    const fee = calculateCardWithdrawFee(amount);
    const actualAmount = amount - fee;

    // 扣除卡片余额
    await db.card.update({
      where: { id: cardId },
      data: { balance: { decrement: amount } },
    });

    // 增加用户账户余额（扣除手续费后）
    await db.user.update({
      where: { id: payload.userId },
      data: { balance: { increment: actualAmount } },
    });

    return NextResponse.json({
      success: true,
      message: '提现成功',
      amount: amount,
      fee: fee,
      actualAmount: actualAmount,
    });

  } catch (error: any) {
    console.error('卡片提现失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
