import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';

// 固定提现配置
const WITHDRAW_CONFIG = {
  minAmount: 10,      // 最低提现 10 USD
  maxAmount: 500,     // 最高提现 500 USD
  feePercent: 0.05,   // 5%
  feeMin: 2,          // 最低手续费 2 USD
};

// 计算账户提现手续费（5%，最低2u）
function calculateWithdrawFee(amount: number): number {
  const percentFee = amount * WITHDRAW_CONFIG.feePercent;
  return Math.max(percentFee, WITHDRAW_CONFIG.feeMin);
}

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
    const { amount, method, address } = body;

    // 验证提现金额
    if (!amount || amount < WITHDRAW_CONFIG.minAmount) {
      return NextResponse.json({ error: `最低提现金额为 $${WITHDRAW_CONFIG.minAmount}` }, { status: 400 });
    }

    if (amount > WITHDRAW_CONFIG.maxAmount) {
      return NextResponse.json({ error: `单次最高提现金额为 $${WITHDRAW_CONFIG.maxAmount}` }, { status: 400 });
    }

    if (!method || !address) {
      return NextResponse.json({ error: '请填写提现方式和收款信息' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 计算手续费（5%，最低2u）
    const fee = calculateWithdrawFee(amount);
    const actualAmount = amount - fee;

    if (user.balance < amount) {
      return NextResponse.json({ error: '余额不足' }, { status: 400 });
    }

    // 创建提现订单
    const order = await db.transaction.create({
      data: {
        userId: payload.userId,
        type: 'withdraw',
        amount: amount,
        status: 'pending',
        paymentMethod: method,
        txHash: address,
      },
    });

    // 先冻结余额（扣除）
    await db.user.update({
      where: { id: payload.userId },
      data: { balance: { decrement: amount } },
    });

    return NextResponse.json({
      success: true,
      message: '提现申请已提交，请等待审核',
      order: {
        id: order.id,
        amount: amount,
        fee: fee,
        actualAmount: actualAmount,
      },
    });

  } catch (error: any) {
    console.error('提现申请失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
