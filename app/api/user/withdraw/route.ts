import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';

// 从数据库获取提现配置
async function getWithdrawConfig() {
  const configs = await db.systemConfig.findMany({
    where: {
      key: {
        in: ['withdraw_min_amount', 'withdraw_max_amount', 'withdraw_fee_percent', 'withdraw_fee_min']
      }
    }
  });

  const configMap: Record<string, string> = {};
  configs.forEach(c => { configMap[c.key] = c.value; });

  // 处理手续费百分比 - 数据库存的是百分比数字(如5)，需要转为小数(0.05)
  const feePercentRaw = parseFloat(configMap['withdraw_fee_percent'] || '5');
  const feePercent = feePercentRaw > 1 ? feePercentRaw / 100 : feePercentRaw;

  return {
    minAmount: parseFloat(configMap['withdraw_min_amount'] || '10'),
    maxAmount: parseFloat(configMap['withdraw_max_amount'] || '500'),
    feePercent: feePercent,  // 5% -> 0.05
    feeMin: parseFloat(configMap['withdraw_fee_min'] || '2'),
  };
}

// 计算账户提现手续费
function calculateWithdrawFee(amount: number, config: { feePercent: number; feeMin: number }): number {
  const percentFee = amount * config.feePercent;
  return Math.max(percentFee, config.feeMin);
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

    // 从数据库获取配置
    const WITHDRAW_CONFIG = await getWithdrawConfig();

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

    // 计算手续费
    const fee = calculateWithdrawFee(amount, WITHDRAW_CONFIG);
    const actualAmount = amount - fee;

    if (user.balance < amount) {
      return NextResponse.json({ error: '余额不足' }, { status: 400 });
    }

    // 创建提现订单 - 保存手续费和实际到账金额
    const order = await db.transaction.create({
      data: {
        userId: payload.userId,
        type: 'withdraw',
        amount: amount,
        status: 'pending',
        paymentMethod: method,
        txHash: JSON.stringify({
          address: address,
          fee: fee,
          actualAmount: actualAmount,
        }),
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
