import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';

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

    if (!amount || amount < 8) {
      return NextResponse.json({ error: '最低提现金额为 $8' }, { status: 400 });
    }

    if (amount > 500) {
      return NextResponse.json({ error: '单次最高提现 $500' }, { status: 400 });
    }

    if (!method || !address) {
      return NextResponse.json({ error: '请填写提现方式和收款信息' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 计算手续费
    const calculateFee = (amt: number): number => {
      if (amt <= 10) return 1;
      if (amt <= 20) return 1;
      if (amt <= 50) return 2;
      if (amt <= 100) return 4;
      if (amt <= 200) return 6;
      if (amt <= 300) return 8;
      return 10;
    };

    const fee = calculateFee(amount);
    const totalDeduct = amount; // 扣除的金额（用户申请多少扣多少，手续费从中扣除)

    if (user.balance < totalDeduct) {
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
        txHash: address, // 复用 txHash 字段存储收款地址/二维码
      },
    });

    // 先冻结余额（扣除）
    await db.user.update({
      where: { id: payload.userId },
      data: { balance: { decrement: totalDeduct } },
    });

    return NextResponse.json({
      success: true,
      message: '提现申请已提交，请等待审核',
      order: {
        id: order.id,
        amount: amount,
        fee: fee,
        actualAmount: amount - fee,
      },
    });

  } catch (error: any) {
    console.error('提现申请失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
