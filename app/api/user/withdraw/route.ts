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
    const { amount, address, network } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '提现金额无效' }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ error: '请填写收款地址' }, { status: 400 });
    }

    // 获取系统设置
    const settings = await db.systemSettings.findFirst();
    const minAmount = settings?.accountWithdrawMinAmount ?? 2;
    const maxAmount = settings?.accountWithdrawMaxAmount ?? 500;
    const feePercent = settings?.accountWithdrawFeePercent ?? 5;
    const feeMin = settings?.accountWithdrawFeeMin ?? 2;

    if (amount < minAmount) {
      return NextResponse.json({ error: `最低提现金额为 $${minAmount}` }, { status: 400 });
    }

    if (amount > maxAmount) {
      return NextResponse.json({ error: `最高提现金额为 $${maxAmount}` }, { status: 400 });
    }

    const fee = Math.max(amount * (feePercent / 100), feeMin);
    const actualAmount = Math.round((amount - fee) * 100) / 100;

    if (actualAmount <= 0) {
      return NextResponse.json({ error: '提现金额太小，扣除手续费后无法到账' }, { status: 400 });
    }

    // ✅ 修复：使用事务原子性检查余额并扣款
    let txRecord;
    try {
      txRecord = await db.$transaction(async (tx) => {
        // 在事务内获取最新余额
        const freshUser = await tx.user.findUnique({
          where: { id: payload.userId },
        });

        if (!freshUser || freshUser.balance < amount) {
          throw new Error(
            `账户余额不足，需要 $${amount.toFixed(2)}，当前余额 $${freshUser?.balance.toFixed(2) || '0.00'}`
          );
        }

        // 检查是否有未处理的提现
        const pendingWithdraw = await tx.transaction.findFirst({
          where: {
            userId: payload.userId,
            type: 'withdraw',
            status: { in: ['pending', 'processing'] },
          },
        });

        if (pendingWithdraw) {
          throw new Error('您有一笔提现正在处理中，请等待完成后再提交');
        }

        // 立即扣款
        await tx.user.update({
          where: { id: payload.userId },
          data: { balance: { decrement: amount } },
        });

        // 创建提现记录
        const record = await tx.transaction.create({
          data: {
            userId: payload.userId,
            type: 'withdraw',
            amount: -amount,
            status: 'pending',
            paymentMethod: 'usdt',
            paymentNetwork: network || 'trc20',
            txHash: JSON.stringify({
              address: address,
              network: network || 'trc20',
              requestAmount: amount,
              fee: fee,
              feePercent: feePercent,
              actualAmount: actualAmount,
            }),
          },
        });

        return record;
      });
    } catch (txError: any) {
      console.error('[提现] 事务失败:', txError.message);
      return NextResponse.json(
        { error: txError.message },
        { status: 400 }
      );
    }

    console.log(`[提现] 申请成功，交易ID: ${txRecord.id}，金额: $${amount}，实际到账: $${actualAmount}`);

    return NextResponse.json({
      success: true,
      message: `提现申请已提交，扣除手续费 $${fee.toFixed(2)}，实际到账 $${actualAmount.toFixed(2)}`,
      data: {
        id: txRecord.id,
        amount,
        fee,
        actualAmount,
      },
    });

  } catch (error: any) {
    console.error('提现失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
