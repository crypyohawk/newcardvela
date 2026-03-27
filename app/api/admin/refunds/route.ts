export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

// 获取所有退款记录
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const refunds = await db.transaction.findMany({
      where: { type: 'refund_hold' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 为每条退款记录计算应扣手续费
    const refundsWithFee = await Promise.all(refunds.map(async (refund) => {
      // 尝试获取卡片类型的退款费率配置
      let feeConfig = {
        smallRefundFee: 3,      // 小额退款费 $3
        largeRefundThreshold: 20, // 大额退款阈值 $20
        refundFeePercent: 5,    // 退款费 5%
        refundFeeMin: 3,        // 最低退款费 $3
      };

      // 从 txHash 解析卡片信息
      let cardInfo: any = null;
      try {
        if (refund.txHash) {
          cardInfo = JSON.parse(refund.txHash);
        }
      } catch (e) {}

      // 如果有 userCardId，获取卡片类型配置
      if (cardInfo?.userCardId) {
        const userCard = await db.userCard.findUnique({
          where: { id: cardInfo.userCardId },
          include: { cardType: true },
        });
        if (userCard?.cardType) {
          const ct = userCard.cardType as any;
          feeConfig = {
            smallRefundFee: ct.smallRefundFee || 3,
            largeRefundThreshold: ct.largeRefundThreshold || 20,
            refundFeePercent: ct.refundFeePercent || 5,
            refundFeeMin: ct.refundFeeMin || 3,
          };
        }
      }

      // 计算应扣手续费
      let ourFee = 0;
      if (refund.amount < feeConfig.largeRefundThreshold) {
        // 小额退款：固定费用
        ourFee = feeConfig.smallRefundFee;
      } else {
        // 大额退款：百分比，最低值
        const percentFee = refund.amount * (feeConfig.refundFeePercent / 100);
        ourFee = Math.max(percentFee, feeConfig.refundFeeMin);
      }

      return {
        ...refund,
        cardInfo,
        feeConfig,
        calculatedFee: ourFee,
        netAmount: refund.amount - ourFee,
      };
    }));

    return NextResponse.json({ refunds: refundsWithFee });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 处理退款（仅更新记录状态，实际退款由管理员在GSalary商户后台手动操作）
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { refundId, action, deductFee } = body;

    const refund = await db.transaction.findUnique({
      where: { id: refundId },
      include: { user: true },
    });

    if (!refund) {
      return NextResponse.json({ error: '退款记录不存在' }, { status: 404 });
    }

    if (refund.status !== 'pending') {
      return NextResponse.json({ error: '该退款已处理' }, { status: 400 });
    }

    if (action === 'confirm') {
      // 确认已退款（管理员已在GSalary商户后台手动调额退回用户）
      const fee = deductFee || 0;
      const refundedToUser = refund.amount - fee;

      await db.transaction.update({
        where: { id: refundId },
        data: {
          status: 'completed',
          paymentProof: JSON.stringify({
            action: 'manual_refund_confirmed',
            originalAmount: refund.amount,
            ourFee: fee,
            refundedToUser: refundedToUser,
            confirmedAt: new Date().toISOString(),
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `已确认退款，手续费 $${fee}，退回用户 $${refundedToUser.toFixed(2)}`,
      });
    }

    if (action === 'reject') {
      // 拒绝退款
      await db.transaction.update({
        where: { id: refundId },
        data: { status: 'failed' },
      });

      return NextResponse.json({ success: true, message: '已拒绝退款' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    console.error('处理退款失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
